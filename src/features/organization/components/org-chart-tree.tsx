"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createOrgChartNode,
  updateOrgChartNode,
  deleteOrgChartNode,
  setOrgChartManual,
} from "@/server/actions/org-chart.actions";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Building2, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

// ─── Types ───────────────────────────────────────────

interface OrgNode {
  id: string;
  parentId: string | null;
  title: string;
  name: string | null;
  department: string | null;
  sortOrder: number;
  kind: "PERSON" | "DEPARTMENT";
}

interface OrgChartTreeProps {
  nodes: OrgNode[];
  manual: boolean;
  canManage: boolean;
}

function boxTone(node: Pick<OrgNode, "title" | "kind">): "line" | "department" | "safety" {
  if (node.kind !== "DEPARTMENT" && /verneombud/i.test(node.title)) return "safety";
  if (node.kind === "DEPARTMENT") return "department";
  return "line";
}

function boxClass(node: Pick<OrgNode, "title" | "kind">): string {
  const tone = boxTone(node);
  if (tone === "safety") return "bg-[#9a3412]";
  if (tone === "department") return "bg-[#1e3a5f]";
  return "bg-[#2b6f7e]";
}

interface TreeNode extends OrgNode {
  children: TreeNode[];
}

// ─── Tree builder ────────────────────────────────────

function buildTree(nodes: OrgNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const node of nodes) {
    map.set(node.id, { ...node, children: [] });
  }

  for (const node of nodes) {
    const treeNode = map.get(node.id)!;
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  }

  const sortChildren = (items: TreeNode[]) => {
    items.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const item of items) sortChildren(item.children);
  };
  sortChildren(roots);
  return roots;
}

// ─── Visual chart node (box) ─────────────────────────

function useRefreshOrgChart() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["settings", "org-chart"] });
    router.refresh();
  };
}

function useNodeDelete(node: OrgNode) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const refresh = useRefreshOrgChart();

  function handleDelete() {
    if (!confirm(`Slett "${node.title}"${node.name ? ` (${node.name})` : ""}? Underordnede flyttes opp.`)) return;
    startTransition(async () => {
      const result = await deleteOrgChartNode(node.id);
      if (!result.success) {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
        return;
      }
      refresh();
    });
  }

  return { isPending, handleDelete };
}

function NodeActions({
  node,
  allNodes,
  isPending,
  onDelete,
  compact,
  onTeal,
}: {
  node: TreeNode;
  allNodes: OrgNode[];
  isPending: boolean;
  onDelete: () => void;
  compact?: boolean;
  onTeal?: boolean;
}) {
  const btn = onTeal
    ? "inline-flex h-8 w-8 items-center justify-center rounded-md bg-black/20 text-white transition-colors"
    : compact
      ? "inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors"
      : "inline-flex h-11 w-11 items-center justify-center rounded-md bg-white/15 text-white transition-colors hover:bg-white/25";

  return (
    <div className={compact || onTeal ? "flex shrink-0 items-center gap-0.5" : "flex shrink-0 items-center gap-1"}>
      <NodeDialog
        parentId={node.id}
        allNodes={allNodes}
        trigger={
          <button
            className={compact && !onTeal ? `${btn} text-green-600 hover:bg-green-50` : `${btn} text-green-200`}
            title="Legg til underordnet"
            aria-label="Legg til underordnet"
          >
            <Plus className={compact || onTeal ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </button>
        }
      />
      <NodeDialog
        editNode={node}
        allNodes={allNodes}
        trigger={
          <button
            className={compact && !onTeal ? `${btn} text-blue-600 hover:bg-blue-50` : `${btn} text-sky-100`}
            title="Rediger"
            aria-label="Rediger"
          >
            <Edit className={compact || onTeal ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </button>
        }
      />
      <button
        className={compact && !onTeal ? `${btn} text-red-500 hover:bg-red-50` : `${btn} text-red-200`}
        onClick={onDelete}
        disabled={isPending}
        title="Slett"
        aria-label="Slett"
      >
        <Trash2 className={compact || onTeal ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
    </div>
  );
}

function ChartBox({
  node,
  canManage,
  allNodes,
}: {
  node: TreeNode;
  canManage: boolean;
  allNodes: OrgNode[];
}) {
  const { isPending, handleDelete } = useNodeDelete(node);

  return (
    <div className="org-chart-node">
      <div className="group relative inline-flex flex-col items-center">
        <div className={`relative min-w-[140px] max-w-[200px] rounded-lg px-5 py-3 text-center text-white shadow-md transition-shadow hover:shadow-lg ${boxClass(node)}`}>
          <p className="text-sm font-semibold leading-tight">{node.title}</p>
          {node.name ? <p className="mt-0.5 text-xs text-white/80">{node.name}</p> : null}
          {node.kind !== "DEPARTMENT" && node.department ? (
            <p className="mt-0.5 text-[10px] text-white/60">{node.department}</p>
          ) : null}

          {canManage ? (
            <div className="absolute -top-3 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-0.5 rounded-full border bg-white px-1 py-0.5 shadow-lg group-hover:flex">
              <NodeActions
                node={node}
                allNodes={allNodes}
                isPending={isPending}
                onDelete={handleDelete}
                compact
              />
            </div>
          ) : null}
        </div>
      </div>

      {node.children.length > 0 ? (
        <div className="org-chart-children">
          {node.children.map((child) => (
            <ChartBox key={child.id} node={child} canManage={canManage} allNodes={allNodes} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MobileOrgNode({
  node,
  canManage,
  allNodes,
  isRoot = false,
}: {
  node: TreeNode;
  canManage: boolean;
  allNodes: OrgNode[];
  isRoot?: boolean;
}) {
  const { isPending, handleDelete } = useNodeDelete(node);
  const subtitle = [node.name, node.kind === "DEPARTMENT" ? null : node.department].filter(Boolean).join(" · ");

  return (
    <li className={`${isRoot ? "mobile-org-root" : "mobile-org-item"}${node.children.length > 0 ? " mobile-org-has-children" : ""}`}>
      <div className="mobile-org-head">
        <div className="mobile-org-gutter" aria-hidden="true" />
        <div className={`mobile-org-box flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2.5 py-2 text-white shadow-sm ${boxClass(node)}`}>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">{node.title}</p>
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs leading-tight text-white/80">{subtitle}</p>
            ) : null}
          </div>
          {canManage ? (
            <NodeActions
              node={node}
              allNodes={allNodes}
              isPending={isPending}
              onDelete={handleDelete}
              onTeal
            />
          ) : null}
        </div>
      </div>
      {node.children.length > 0 ? (
        <div className="mobile-org-branch">
          <div className="mobile-org-gutter" aria-hidden="true" />
          <ul className="mobile-org-children">
            {node.children.map((child) => (
              <MobileOrgNode
                key={child.id}
                node={child}
                canManage={canManage}
                allNodes={allNodes}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

// ─── Node create/edit dialog ─────────────────────────

function NodeDialog({
  parentId,
  editNode,
  allNodes,
  trigger,
}: {
  parentId?: string;
  editNode?: OrgNode;
  allNodes: OrgNode[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(editNode?.title ?? "");
  const [name, setName] = useState(editNode?.name ?? "");
  const [department, setDepartment] = useState(editNode?.department ?? "");
  const [kind, setKind] = useState<"PERSON" | "DEPARTMENT">(editNode?.kind ?? "PERSON");
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const refresh = useRefreshOrgChart();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      const result = editNode
        ? await updateOrgChartNode({
            id: editNode.id,
            title: title.trim(),
            name: kind === "DEPARTMENT" ? null : name.trim() || null,
            department: department.trim() || null,
            kind,
          })
        : await createOrgChartNode({
            parentId: parentId ?? null,
            title: title.trim(),
            name: kind === "DEPARTMENT" ? null : name.trim() || null,
            department: department.trim() || null,
            kind,
          });

      if (result.success) {
        toast({ title: editNode ? "Oppdatert" : "Opprettet" });
        refresh();
        setOpen(false);
        if (!editNode) {
          setTitle("");
          setName("");
          setDepartment("");
          setKind("PERSON");
        }
      } else {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v && editNode) {
        setTitle(editNode.title);
        setName(editNode.name ?? "");
        setDepartment(editNode.department ?? "");
        setKind(editNode.kind ?? "PERSON");
      }
    }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editNode ? "Rediger rolle" : "Legg til ny rolle"}</DialogTitle>
            <DialogDescription>
              {editNode
                ? "Oppdater informasjon for denne rollen i organisasjonskartet"
                : "Legg til en ny rolle i organisasjonshierarkiet"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="node-kind">Type</Label>
              <select
                id="node-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value === "DEPARTMENT" ? "DEPARTMENT" : "PERSON")}
                className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm sm:h-9"
              >
                <option value="PERSON">Person / rolle</option>
                <option value="DEPARTMENT">Avdeling</option>
              </select>
              <p className="text-[11px] text-muted-foreground">
                Skriv Verneombud i tittelen for å få egen farge på boksen.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="node-title">{kind === "DEPARTMENT" ? "Avdelingsnavn *" : "Stillingstittel / Rolle *"}</Label>
              <Input
                id="node-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="F.eks. Daglig leder, HMS-ansvarlig"
                required
              />
            </div>
            {kind === "PERSON" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="node-name">Navn på person</Label>
                  <Input
                    id="node-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="F.eks. Ola Nordmann"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="node-dept">Avdeling</Label>
                  <Input
                    id="node-dept"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="F.eks. Drift, Administrasjon"
                  />
                </div>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button type="submit" disabled={isPending || !title.trim()}>
              {editNode ? "Lagre" : "Opprett"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── CSS for connector lines ─────────────────────────

const chartStyles = `
  .org-chart-root {
    overflow: auto;
    padding: 2rem 1rem;
    max-height: 70vh;
  }

  .org-chart-node {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  }

  /* Vertical line DOWN from parent box to the horizontal bar */
  .org-chart-children {
    display: flex;
    justify-content: center;
    gap: 0;
    padding-top: 24px;
    position: relative;
  }

  .org-chart-children::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    width: 2px;
    height: 24px;
    background: #94a3b8;
    transform: translateX(-50%);
  }

  /* Each child in the row */
  .org-chart-children > .org-chart-node {
    padding-top: 24px;
    position: relative;
  }

  /* Vertical line UP from child box to horizontal bar */
  .org-chart-children > .org-chart-node::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    width: 2px;
    height: 24px;
    background: #94a3b8;
    transform: translateX(-50%);
  }

  /* Horizontal bar connecting siblings */
  .org-chart-children > .org-chart-node:not(:only-child)::after {
    content: '';
    position: absolute;
    top: 0;
    height: 2px;
    background: #94a3b8;
  }

  /* First child: bar from center to right */
  .org-chart-children > .org-chart-node:first-child:not(:only-child)::after {
    left: 50%;
    right: 0;
  }

  /* Last child: bar from left to center */
  .org-chart-children > .org-chart-node:last-child:not(:only-child)::after {
    left: 0;
    right: 50%;
  }

  /* Middle children: bar spans full width */
  .org-chart-children > .org-chart-node:not(:first-child):not(:last-child)::after {
    left: 0;
    right: 0;
  }

  /* Only child: no horizontal bar, just vertical */
  .org-chart-children > .org-chart-node:only-child::after {
    display: none;
  }

  /* Spacing between sibling nodes */
  .org-chart-children > .org-chart-node {
    padding-left: 12px;
    padding-right: 12px;
  }

  .mobile-org-tree,
  .mobile-org-children {
    list-style: none;
    margin: 0;
    padding: 0;
    min-width: 0;
    width: 100%;
  }

  .mobile-org-head,
  .mobile-org-branch {
    display: flex;
    align-items: stretch;
    min-width: 0;
  }

  .mobile-org-children {
    flex: 1;
  }

  .mobile-org-gutter {
    position: relative;
    width: 28px;
    flex: none;
  }

  .mobile-org-root > .mobile-org-head > .mobile-org-gutter,
  .mobile-org-root > .mobile-org-branch > .mobile-org-gutter {
    display: none;
  }

  .mobile-org-children > .mobile-org-item > .mobile-org-head {
    padding-top: 10px;
  }

  .mobile-org-children > .mobile-org-item > .mobile-org-head > .mobile-org-gutter::before,
  .mobile-org-children > .mobile-org-item > .mobile-org-branch > .mobile-org-gutter::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background-color: #1e5a66;
  }

  .mobile-org-children > .mobile-org-item:first-child > .mobile-org-head > .mobile-org-gutter::before {
    top: 50%;
  }

  .mobile-org-children > .mobile-org-item:last-child > .mobile-org-head > .mobile-org-gutter::before {
    bottom: 50%;
  }

  .mobile-org-children > .mobile-org-item.mobile-org-has-children:last-child > .mobile-org-head > .mobile-org-gutter::before {
    bottom: 0;
  }

  .mobile-org-children > .mobile-org-item > .mobile-org-head > .mobile-org-gutter::after {
    content: "";
    position: absolute;
    left: 0;
    top: 50%;
    width: 28px;
    height: 4px;
    background-color: #1e5a66;
    transform: translateY(-50%);
  }
`;

// ─── Main export ─────────────────────────────────────

function ChartModeControl({ manual }: { manual: boolean }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const refresh = useRefreshOrgChart();

  function toggle() {
    if (
      manual &&
      !confirm("Kartet bygges på nytt fra ansatte og avdelinger. Dine egne bokser blir erstattet.")
    ) {
      return;
    }
    startTransition(async () => {
      const result = await setOrgChartManual(!manual);
      if (!result.success) {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
        return;
      }
      toast({
        title: manual ? "Automatisk kart" : "Eget kart",
        description: manual
          ? "Kartet følger ansatte og avdelinger igjen."
          : "Automatikken er skrudd av. Du kan bygge kartet selv.",
      });
      refresh();
    });
  }

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-lg border bg-muted/40 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {manual
          ? "Du styrer kartet selv. Endringer i ansatte oppdaterer det ikke."
          : "Kartet følger ansatte og avdelinger. Avdeling øverst, leder under, øvrige under lederen."}
      </p>
      <Button
        type="button"
        variant="outline"
        className="bg-transparent sm:shrink-0"
        disabled={isPending}
        onClick={toggle}
      >
        {manual ? "Følg ansatte igjen" : "Bygg kartet selv"}
      </Button>
    </div>
  );
}

export function OrgChartTree({ nodes, manual, canManage }: OrgChartTreeProps) {
  const tree = buildTree(nodes);
  const isEmpty = tree.length === 0;
  const [scale, setScale] = useState(1);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: chartStyles }} />

      {isEmpty ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="h-14 w-14 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ingen ansatte i kartet ennå</h3>
            <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
              Kartet fylles automatisk når ansatte og avdelinger er lagt inn. Avdelingen ligger øverst, avdelingsleder under, og de andre i avdelingen under lederen.
            </p>
            {canManage ? <ChartModeControl manual={manual} /> : null}
            {canManage && (
              <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
                <NodeDialog
                  allNodes={nodes}
                  trigger={
                    <Button size="lg" className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" />
                      Legg til øverste leder
                    </Button>
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="px-3 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-6">
            {canManage ? <ChartModeControl manual={manual} /> : null}
            {canManage ? (
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <NodeDialog
                  allNodes={nodes}
                  trigger={
                    <Button variant="outline" className="w-full bg-transparent sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" />
                      Legg til toppnivå
                    </Button>
                  }
                />
              </div>
            ) : null}

            <ul className="mobile-org-tree lg:hidden">
              {tree.map((root) => (
                <MobileOrgNode
                  key={root.id}
                  node={root}
                  canManage={canManage}
                  allNodes={nodes}
                  isRoot
                />
              ))}
            </ul>

            <div className="mb-3 hidden items-center justify-end gap-2 lg:flex">
              <Button type="button" variant="outline" size="sm" className="bg-transparent" onClick={() => setScale((value) => Math.max(0.4, Number((value - 0.1).toFixed(2))))}>
                <ZoomOut className="mr-1 h-4 w-4" />
                Mindre
              </Button>
              <Button type="button" variant="outline" size="sm" className="bg-transparent" onClick={() => setScale(1)}>
                <Maximize2 className="mr-1 h-4 w-4" />
                Tilpass
              </Button>
              <Button type="button" variant="outline" size="sm" className="bg-transparent" onClick={() => setScale((value) => Math.min(2, Number((value + 0.1).toFixed(2))))}>
                <ZoomIn className="mr-1 h-4 w-4" />
                Større
              </Button>
              <span className="text-xs text-muted-foreground">{Math.round(scale * 100)}%</span>
            </div>
            <div className="org-chart-root hidden lg:block">
              <div
                className="flex justify-center gap-8"
                style={{ zoom: scale } as CSSProperties}
              >
                {tree.map((root) => (
                  <ChartBox
                    key={root.id}
                    node={root}
                    canManage={canManage}
                    allNodes={nodes}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#1e3a5f]" />
                Avdeling
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#2b6f7e]" />
                Linje
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#9a3412]" />
                Verneombud
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
