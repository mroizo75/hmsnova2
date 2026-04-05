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

function ChartBox({
  node,
  canManage,
  allNodes,
}: {
  node: TreeNode;
  canManage: boolean;
  allNodes: OrgNode[];
}) {
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

  return (
    <div className="org-chart-node">
      {/* The box itself */}
      <div className="group relative inline-flex flex-col items-center">
        <div className="relative bg-[#2b6f7e] text-white rounded-lg shadow-md px-5 py-3 min-w-[140px] max-w-[200px] text-center transition-shadow hover:shadow-lg">
          <p className="font-semibold text-sm leading-tight">{node.title}</p>
          {node.name && (
            <p className="text-xs text-white/80 mt-0.5">{node.name}</p>
          )}
          {node.department && (
            <p className="text-[10px] text-white/60 mt-0.5">{node.department}</p>
          )}

          {/* Hover actions */}
          {canManage && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center gap-0.5 bg-white rounded-full shadow-lg border px-1 py-0.5 z-10">
              <NodeDialog
                parentId={node.id}
                allNodes={allNodes}
                trigger={
                  <button className="p-1 rounded-full hover:bg-green-50 text-green-600 transition-colors" title="Legg til underordnet">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                }
              />
              <NodeDialog
                editNode={node}
                allNodes={allNodes}
                trigger={
                  <button className="p-1 rounded-full hover:bg-blue-50 text-blue-600 transition-colors" title="Rediger">
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                }
              />
              <button
                className="p-1 rounded-full hover:bg-red-50 text-red-500 transition-colors"
                onClick={handleDelete}
                disabled={isPending}
                title="Slett"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Children with connectors */}
      {node.children.length > 0 && (
        <div className="org-chart-children">
          {node.children.map((child) => (
            <ChartBox key={child.id} node={child} canManage={canManage} allNodes={allNodes} />
          ))}
        </div>
      )}
    </div>
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
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Start med å legge til øverste leder (f.eks. Daglig leder) for å bygge opp organisasjonskartet.
              Du kan deretter legge til underordnede roller ved å holde over boksene.
            </p>
            {canManage && (
              <NodeDialog
                allNodes={nodes}
                trigger={
                  <Button size="lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Legg til øverste leder
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 pb-8">
            {canManage && (
              <div className="flex justify-end mb-2">
                <NodeDialog
                  allNodes={nodes}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Legg til toppnivå
                    </Button>
                  }
                />
              </div>
            )}
            <div className="org-chart-root">
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
            {canManage && (
              <p className="text-xs text-muted-foreground text-center mt-6">
                Hold musepekeren over en boks for å legge til underordnede, redigere eller slette
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
