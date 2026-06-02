"use client";
import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { ServiceGraph } from "@/types";

const SAMPLE_GRAPH: ServiceGraph = {
  nodes: [
    { id: "k8s-node-primary-01", label: "k8s-node-primary-01", type: "host", status: "ONLINE", isCurrent: true, isAffected: true },
    { id: "db-master", label: "db-master", type: "database", status: "ONLINE", isAffected: true },
    { id: "redis-cache", label: "redis-cache", type: "cache", status: "ONLINE" },
    { id: "kafka", label: "kafka", type: "queue", status: "ONLINE" },
    { id: "api-gateway", label: "api-gateway", type: "service", status: "ONLINE" },
    { id: "worker-02", label: "k8s-node-worker-02", type: "host", status: "ONLINE" },
  ],
  links: [
    { source: "k8s-node-primary-01", target: "db-master" },
    { source: "k8s-node-primary-01", target: "redis-cache" },
    { source: "k8s-node-primary-01", target: "kafka" },
    { source: "api-gateway", target: "k8s-node-primary-01" },
    { source: "worker-02", target: "k8s-node-primary-01" },
    { source: "worker-02", target: "db-master" },
  ],
};

interface DependencyGraphProps {
  graph?: ServiceGraph;
  height?: number;
}

const NODE_COLORS: Record<string, string> = {
  host: "#3b82f6",
  service: "#8b5cf6",
  database: "#10b981",
  cache: "#f59e0b",
  queue: "#f97316",
};

export function DependencyGraph({ graph = SAMPLE_GRAPH, height = 320 }: DependencyGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const width = el.clientWidth || 600;
    d3.select(el).selectAll("*").remove();

    const svg = d3.select(el)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("background", "transparent");

    // Defs: arrowhead marker
    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "rgba(255,255,255,0.2)");

    type NodeDatum = d3.SimulationNodeDatum & typeof graph.nodes[number];
    const nodes: NodeDatum[] = graph.nodes.map((n) => ({ ...n }));
    const links = graph.links.map((l) => ({ ...l }));

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: d3.SimulationNodeDatum) => (d as NodeDatum).id).distance(80))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(28));

    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "rgba(255,255,255,0.12)")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrow)");

    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .style("cursor", "pointer")
      .call(
        d3.drag<SVGGElement, NodeDatum>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          }) as never
      );

    // Node circles
    node.append("circle")
      .attr("r", (d) => d.isCurrent ? 18 : 14)
      .attr("fill", (d) =>
        d.isAffected ? "rgba(239,68,68,0.2)" : `${NODE_COLORS[d.type] ?? "#3b82f6"}20`
      )
      .attr("stroke", (d) =>
        d.isCurrent ? "#3b82f6" : d.isAffected ? "#ef4444" : (NODE_COLORS[d.type] ?? "#3b82f6")
      )
      .attr("stroke-width", (d) => d.isCurrent ? 2.5 : 1.5);

    // Labels
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 28)
      .attr("fill", "rgba(255,255,255,0.6)")
      .attr("font-size", "9px")
      .attr("font-family", "JetBrains Mono")
      .text((d) => d.label.length > 16 ? d.label.slice(0, 14) + "…" : d.label);

    // Type icons (emoji-style text)
    const typeIcons: Record<string, string> = { host: "🖥", database: "🗄", cache: "⚡", queue: "📨", service: "⚙" };
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 5)
      .attr("font-size", "12px")
      .text((d) => typeIcons[d.type] ?? "●");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as unknown as NodeDatum).x ?? 0)
        .attr("y1", (d) => (d.source as unknown as NodeDatum).y ?? 0)
        .attr("x2", (d) => (d.target as unknown as NodeDatum).x ?? 0)
        .attr("y2", (d) => (d.target as unknown as NodeDatum).y ?? 0);

      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => { simulation.stop(); };
  }, [graph, height]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <span className="text-sm font-semibold">Service Dependency Graph</span>
        <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block"/> Current host</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500 inline-block"/> Affected</span>
        </div>
      </div>
      <svg ref={svgRef} className="w-full" style={{ height }} />
    </div>
  );
}
