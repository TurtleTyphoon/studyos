import { useEffect, useRef, useState } from 'react'
import type { Note } from '../../types/database'

interface ConceptGraphProps {
  notes: Note[]
  onOpenNote: (note: Note) => void
  onClose: () => void
}

interface GraphNode {
  id: string
  label: string
  type: 'note' | 'concept'
  x: number
  y: number
  vx: number
  vy: number
  note?: Note
}

interface GraphEdge {
  source: string
  target: string
}

export default function ConceptGraph({ notes, onOpenNote, onClose }: ConceptGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [dragging, setDragging] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const animRef = useRef<number>(0)
  const nodesRef = useRef<GraphNode[]>([])

  useEffect(() => {
    const noteNodes: GraphNode[] = []
    const conceptNodes: GraphNode[] = []
    const edgeList: GraphEdge[] = []
    const conceptSet = new Map<string, string>()

    const centerX = 400
    const centerY = 300

    notes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / Math.max(notes.length, 1)
      const r = 120 + Math.random() * 80
      noteNodes.push({
        id: `note-${n.id}`,
        label: n.title.length > 20 ? n.title.slice(0, 18) + '...' : n.title,
        type: 'note',
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r,
        vx: 0, vy: 0,
        note: n,
      })

      n.concepts.forEach(c => {
        const key = c.toLowerCase()
        if (!conceptSet.has(key)) {
          const ca = Math.random() * Math.PI * 2
          const cr = 60 + Math.random() * 40
          conceptSet.set(key, `concept-${key}`)
          conceptNodes.push({
            id: `concept-${key}`,
            label: c,
            type: 'concept',
            x: centerX + Math.cos(ca) * cr,
            y: centerY + Math.sin(ca) * cr,
            vx: 0, vy: 0,
          })
        }
        edgeList.push({ source: `note-${n.id}`, target: conceptSet.get(key)! })
      })
    })

    const allNodes = [...noteNodes, ...conceptNodes]
    nodesRef.current = allNodes
    setNodes(allNodes)
    setEdges(edgeList)
  }, [notes])

  useEffect(() => {
    let running = true

    function simulate() {
      if (!running) return
      const ns = nodesRef.current
      const centerX = 400, centerY = 300

      for (const node of ns) {
        node.vx *= 0.9
        node.vy *= 0.9

        const dx = centerX - node.x
        const dy = centerY - node.y
        node.vx += dx * 0.001
        node.vy += dy * 0.001
      }

      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[j].x - ns[i].x
          const dy = ns[j].y - ns[i].y
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
          const force = 800 / (dist * dist)
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          ns[i].vx -= fx
          ns[i].vy -= fy
          ns[j].vx += fx
          ns[j].vy += fy
        }
      }

      for (const edge of edges) {
        const s = ns.find(n => n.id === edge.source)
        const t = ns.find(n => n.id === edge.target)
        if (!s || !t) continue
        const dx = t.x - s.x
        const dy = t.y - s.y
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
        const targetDist = 100
        const force = (dist - targetDist) * 0.005
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        s.vx += fx
        s.vy += fy
        t.vx -= fx
        t.vy -= fy
      }

      for (const node of ns) {
        if (node.id === dragging) continue
        node.x += node.vx
        node.y += node.vy
        node.x = Math.max(40, Math.min(760, node.x))
        node.y = Math.max(40, Math.min(560, node.y))
      }

      setNodes([...ns])
      animRef.current = requestAnimationFrame(simulate)
    }

    animRef.current = requestAnimationFrame(simulate)
    return () => { running = false; cancelAnimationFrame(animRef.current) }
  }, [edges, dragging])

  function handleMouseDown(id: string) {
    setDragging(id)
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const node = nodesRef.current.find(n => n.id === dragging)
    if (node) {
      node.x = x
      node.y = y
      node.vx = 0
      node.vy = 0
    }
  }

  function handleMouseUp() {
    setDragging(null)
  }

  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  return (
    <div className="concept-graph-container">
      <div className="concept-graph-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-network" style={{ fontSize: 14 }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Concept Graph</span>
          <span style={{ fontSize: 10, color: 'var(--subtle)' }}>{notes.length} notes, {nodes.filter(n => n.type === 'concept').length} concepts</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--subtle)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text)', display: 'inline-block' }} /> Notes
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--surface)', border: '1px solid var(--border)', display: 'inline-block', marginLeft: 6 }} /> Concepts
          </span>
          <button className="btn" onClick={onClose}>
            <i className="ti ti-x" style={{ fontSize: 12 }} />Close
          </button>
        </div>
      </div>
      <svg
        ref={svgRef}
        viewBox="0 0 800 600"
        className="concept-graph-svg"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {edges.map((e, i) => {
          const s = nodeMap.get(e.source)
          const t = nodeMap.get(e.target)
          if (!s || !t) return null
          const isHighlighted = hoveredNode === e.source || hoveredNode === e.target
          return (
            <line
              key={i}
              x1={s.x} y1={s.y} x2={t.x} y2={t.y}
              stroke={isHighlighted ? 'var(--text)' : 'var(--border)'}
              strokeWidth={isHighlighted ? 1.5 : 0.8}
              opacity={hoveredNode && !isHighlighted ? 0.15 : 1}
            />
          )
        })}
        {nodes.map(node => {
          const isHovered = hoveredNode === node.id
          const isConnected = hoveredNode && edges.some(
            e => (e.source === hoveredNode && e.target === node.id) || (e.target === hoveredNode && e.source === node.id)
          )
          const dimmed = hoveredNode && !isHovered && !isConnected

          return (
            <g
              key={node.id}
              onMouseDown={() => handleMouseDown(node.id)}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => { if (node.note) onOpenNote(node.note) }}
              style={{ cursor: node.type === 'note' ? 'pointer' : 'grab', opacity: dimmed ? 0.15 : 1 }}
            >
              {node.type === 'note' ? (
                <circle
                  cx={node.x} cy={node.y}
                  r={isHovered ? 18 : 14}
                  fill={isHovered ? 'var(--text)' : '#fff'}
                  stroke="var(--text)"
                  strokeWidth={1.5}
                />
              ) : (
                <rect
                  x={node.x - (isHovered ? 22 : 18)} y={node.y - (isHovered ? 11 : 9)}
                  width={isHovered ? 44 : 36} height={isHovered ? 22 : 18}
                  rx={3}
                  fill={isHovered ? 'var(--surface)' : '#fff'}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
              )}
              <text
                x={node.x} y={node.y + (node.type === 'note' ? 28 : 24)}
                textAnchor="middle"
                fontSize={isHovered ? 11 : 9}
                fontWeight={isHovered ? 600 : 400}
                fill="var(--text)"
                fontFamily="var(--font)"
              >
                {node.label}
              </text>
              {node.type === 'concept' && (
                <text
                  x={node.x} y={node.y + 3}
                  textAnchor="middle"
                  fontSize={7}
                  fill="var(--muted)"
                  fontFamily="var(--font)"
                >
                  {node.label.slice(0, 5)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
