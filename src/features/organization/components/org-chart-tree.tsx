"use client";

import { useState, useTransition } from "react";
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
} from "@/server/actions/org-chart.actions";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Building2 } from "lucide-react";

// ─── Types ───────────────────────────────────────────

interface OrgNode {
  id: string;
  parentId: string | null;
  title: string;
  name: string | null;
  department: string | null;
  sortOrder: number;
}

interface OrgChartTreeProps {
  nodes: OrgNode[];
  canManage: boolean;
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

function useNodeDelete(node: OrgNode) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  function handleDelete() {
    if (!confirm(`Slett "${node.title}"${node.name ? ` (${node.name})` : ""}? Underordnede flyttes opp.`)) return;
    startTransition(async () => {
      const result = await deleteOrgChartNode(node.id);
      if (!result.success) {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
      }
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
        <div className="relative min-w-[140px] max-w-[200px] rounded-lg bg-[#2b6f7e] px-5 py-3 text-center text-white shadow-md transition-shadow hover:shadow-lg">
          <p className="text-sm font-semibold leading-tight">{node.title}</p>
          {node.name ? <p className="mt-0.5 text-xs text-white/80">{node.name}</p> : null}
          {node.department ? <p className="mt-0.5 text-[10px] text-white/60">{node.department}</p> : null}

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
  const subtitle = [node.name, node.department].filter(Boolean).join(" · ");

  return (
    <li className={isRoot ? "mobile-org-root" : undefined}>
      <div className="mobile-org-box flex items-center gap-1.5 rounded-md bg-[#2b6f7e] px-2.5 py-1.5 text-white shadow-sm">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-tight">{node.title}</p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-[11px] leading-tight text-white/80">{subtitle}</p>
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
      {node.children.length > 0 ? (
        <ul>
          {node.children.map((child) => (
            <MobileOrgNode
              key={child.id}
              node={child}
              canManage={canManage}
              allNodes={allNodes}
            />
          ))}
        </ul>
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
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      const result = editNode
        ? await updateOrgChartNode({
            id: editNode.id,
            title: title.trim(),
            name: name.trim() || null,
            department: department.trim() || null,
          })
        : await createOrgChartNode({
            parentId: parentId ?? null,
            title: title.trim(),
            name: name.trim() || null,
            department: department.trim() || null,
          });

      if (result.success) {
        toast({ title: editNode ? "Oppdatert" : "Opprettet" });
        setOpen(false);
        if (!editNode) {
          setTitle("");
          setName("");
          setDepartment("");
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
              <Label htmlFor="node-title">Stillingstittel / Rolle *</Label>
              <Input
                id="node-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="F.eks. Daglig leder, HMS-ansvarlig"
                required
              />
            </div>
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
    overflow-x: auto;
    padding: 2rem 1rem;
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
  .mobile-org-tree ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .mobile-org-tree {
    --org-line: #1e5a66;
    --org-line-w: 3px;
    --org-gutter: 18px;
  }

  .mobile-org-tree > li + li {
    margin-top: 10px;
  }

  .mobile-org-tree ul {
    margin-left: 10px;
  }

  .mobile-org-tree li {
    position: relative;
  }

  .mobile-org-tree li li {
    padding-top: 8px;
    padding-left: var(--org-gutter);
  }

  .mobile-org-tree li li::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: var(--org-line-w);
    height: 100%;
    background: var(--org-line);
    border-radius: 1px;
  }

  .mobile-org-tree li li:last-child::before {
    height: 20px;
  }

  .mobile-org-tree li li::after {
    content: "";
    position: absolute;
    left: 0;
    top: 20px;
    width: var(--org-gutter);
    height: var(--org-line-w);
    background: var(--org-line);
    border-radius: 1px;
  }
`;

// ─── Main export ─────────────────────────────────────

export function OrgChartTree({ nodes, canManage }: OrgChartTreeProps) {
  const tree = buildTree(nodes);
  const isEmpty = tree.length === 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: chartStyles }} />

      {isEmpty ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="h-14 w-14 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ingen roller lagt til ennå</h3>
            <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
              Start med å legge til øverste leder (f.eks. Daglig leder) for å bygge opp organisasjonskartet.
              Du kan deretter legge til underordnede roller fra hver boks.
            </p>
            {canManage && (
              <NodeDialog
                allNodes={nodes}
                trigger={
                  <Button size="lg" className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Legg til øverste leder
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="px-3 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-6">
            {canManage ? (
              <div className="mb-4 flex justify-stretch sm:justify-end">
                <NodeDialog
                  allNodes={nodes}
                  trigger={
                    <Button variant="outline" className="w-full sm:w-auto">
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

            <div className="org-chart-root hidden lg:block">
              <div className="flex justify-center gap-8">
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

            {canManage ? (
              <p className="mt-6 text-center text-xs text-muted-foreground">
                <span className="lg:hidden">Bruk knappene på hver rolle for å legge til underordnede, redigere eller slette</span>
                <span className="hidden lg:inline">Hold musepekeren over en boks for å legge til underordnede, redigere eller slette</span>
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}
    </>
  );
}
