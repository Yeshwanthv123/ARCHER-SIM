import { useEffect, useState, useRef } from "react";
import * as dagre from "dagre";

/* ================= ICON IMPORTS ================= */
import startIcon from "../assets/icons/start.png";
import updateIcon from "../assets/icons/update_content.png";
import evaluateIcon from "../assets/icons/evaluate_content.png";
import notificationIcon from "../assets/icons/send_notification.png";
import stopIcon from "../assets/icons/Stop.png";
import textIcon from "../assets/icons/text_node.png";
import launchIcon from "../assets/icons/launch_event.png";
import userActionIcon from "../assets/icons/user_action.png";
import waitIcon from "../assets/icons/wait_for_content_update.png";
import transitionIcon from "../assets/icons/transition_node.png";
import loopIcon from "../assets/icons/looping_node.png";

/* ================= TYPES ================= */

type Field = {
  type: string;
  fieldName: string;
  value: string;
  dateOption?: string;
};

type Rule = {
  fieldType: string;
  fieldName: string;
  operator: string;
  value: string;
  dateOption?: string;
  logic?: string;
};

type Step = {
  action: string;
  fields: Field[];
  rules?: Rule[];
  trueStep?: number | "";
  defaultStep?: number | "";
};

type Props = {
  steps: Step[];
  onExit: () => void;
};

type NodePosition = {
  x: number;
  y: number;
  width: number;
  height: number;
  stepIndex: number;
};

type ArrowPath = {
  from: number;
  to: number;
  label: string;
  isTrue?: boolean;
  weight?: number;
  points?: { x: number; y: number }[];
};

/* ================= ICON MAP ================= */

const iconMap: Record<string, string> = {
  start: startIcon,
  update: updateIcon,
  condition: evaluateIcon,
  notification: notificationIcon,
  stop: stopIcon,
  text: textIcon,
  layout: evaluateIcon,
  launch: launchIcon,
  useraction: userActionIcon,
  wait: waitIcon,
  transition: transitionIcon,
  looping: loopIcon
};

const NODE_WIDTH = 110;
const NODE_HEIGHT = 110;

/* ================= GRAPH LAYOUT ALGORITHM ================= */
const calculateLayout = (steps: Step[]) => {
  try {
    const dagreInstance = (dagre as any).default || dagre;
    const g = new dagreInstance.graphlib.Graph({ multigraph: true });
    g.setGraph({
      rankdir: "LR", // Left-to-Right layout
      marginx: 100,
      marginy: 100,
      nodesep: 80, // Reduced slightly to accommodate very complex structures
      ranksep: 200, // Reduced to pack nodes better horizontally
      edgesep: 60,
      ranker: "network-simplex",
      acyclicer: "greedy" // Helps ensure start nodes stay on the left by resolving cycles
    });
    g.setDefaultEdgeLabel(() => ({}));

    steps.forEach((_, i) => {
      g.setNode(String(i), { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    const arrows: ArrowPath[] = [];
    steps.forEach((step, i) => {
      const action = (step.action || "").toLowerCase();
      if (action === "condition") {
        if (step.trueStep !== undefined && step.trueStep !== "") {
          const to = Number(step.trueStep) - 1;
          if (to >= 0 && to < steps.length) {
            arrows.push({ from: i, to, label: "IF TRUE", isTrue: true, weight: 1 });
          }
        }
        if (step.defaultStep !== undefined && step.defaultStep !== "") {
          const to = Number(step.defaultStep) - 1;
          if (to >= 0 && to < steps.length) {
            arrows.push({ from: i, to, label: "DEFAULT", isTrue: false, weight: 1 });
          }
        }
      } else if (action !== "stop" && i + 1 < steps.length) {
        // Higher weight for the main sequence ensures it stays straight
        arrows.push({ from: i, to: i + 1, label: "", weight: 2 });
      }
    });

    arrows.forEach((arrow, idx) => {
      g.setEdge(String(arrow.from), String(arrow.to), { 
        label: arrow.label, 
        weight: arrow.weight || 1,
        minlen: 1
      }, String(idx));
    });

    // Enforce Start node (0) to always be the absolute leftmost by adding hidden edges
    // to any node that currently has no incoming connections.
    const hasIncoming = new Array(steps.length).fill(false);
    arrows.forEach(arrow => {
      hasIncoming[arrow.to] = true;
    });

    for (let i = 1; i < steps.length; i++) {
      if (!hasIncoming[i]) {
        // Add a layout-only edge from Start to this disconnected node
        g.setEdge("0", String(i), { weight: 0, minlen: 1 }, `hidden_${i}`);
      }
    }

    dagreInstance.layout(g);

    const nodePositions: NodePosition[] = steps.map((_, i) => {
      const node = g.node(String(i));
      return {
        x: node ? node.x - NODE_WIDTH / 2 : 0,
        y: node ? node.y - NODE_HEIGHT / 2 : 0,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        stepIndex: i
      };
    });

    const arrowPaths = arrows.map((arrow, idx) => {
      const edge = g.edge(String(arrow.from), String(arrow.to), String(idx));
      return {
        ...arrow,
        points: edge ? edge.points : []
      };
    });

    return { nodePositions, arrowPaths };
  } catch (err) {
    console.error("Layout error:", err);
    return { nodePositions: [], arrowPaths: [] };
  }
};

/* ================= TRANSITION NODE RENDERING ================= */
const drawTransitionNodes = (
  ctx: CanvasRenderingContext2D,
  arrows: ArrowPath[]
) => {
  for (const arrow of arrows) {
    if (!arrow.points || arrow.points.length < 2) continue;

    const pts = arrow.points;

    // Draw straight/curved line through points
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2.5;
    
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);

    // Draw smooth rounded polylines
    for (let i = 1; i < pts.length - 1; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      
      // Dynamically calculate radius so we don't overshoot short line segments in complex diagrams
      const dist1 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      const dist2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const radius = Math.min(20, dist1 / 2, dist2 / 2);
      
      ctx.arcTo(p1.x, p1.y, p2.x, p2.y, radius);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();

    // Draw arrow head at the end
    // Calculate angle from the last segment
    const pPrev = pts.length > 1 ? pts[pts.length - 2] : pts[0];
    const pEnd = pts[pts.length - 1];
    
    // For smooth curves, it's better to use a small offset back from the end point 
    // to determine the exact angle if points are very close.
    let dx = pEnd.x - pPrev.x;
    let dy = pEnd.y - pPrev.y;
    
    // If the last segment is purely horizontal/vertical, use it.
    // If there's an arc, the angle at the tip is still basically the vector from pPrev to pEnd 
    // because the last segment after the arc is a straight line.

    const angle = Math.atan2(dy, dx);
    
    const headlen = 15;
    ctx.beginPath();
    ctx.moveTo(pEnd.x, pEnd.y);
    ctx.lineTo(
      pEnd.x - headlen * Math.cos(angle - Math.PI / 6),
      pEnd.y - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      pEnd.x - headlen * Math.cos(angle + Math.PI / 6),
      pEnd.y - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.lineTo(pEnd.x, pEnd.y);
    ctx.fillStyle = "black";
    ctx.fill();

    // Draw label
    if (arrow.label) {
      const midPoint = pts[Math.floor(pts.length / 2)];
      ctx.fillStyle = arrow.isTrue ? "#15803d" : "#991b1b";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      
      ctx.save();
      const textWidth = ctx.measureText(arrow.label).width;
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fillRect(midPoint.x - textWidth / 2 - 4, midPoint.y - 12 - 10, textWidth + 8, 16);
      ctx.restore();

      ctx.fillText(arrow.label, midPoint.x, midPoint.y - 10);
    }
  }
};

const leftMenuItems = [
  { label: "Start", icon: iconMap.start },
  { label: "Stop", icon: iconMap.stop },
  { label: "Text Node", icon: iconMap.text },
  { label: "Transition", icon: iconMap.transition, active: true },
];

const generalItems = [
  { label: "Evaluate Content", icon: iconMap.condition, active: true },
  { label: "Launch Event", icon: iconMap.launch },
  { label: "Send Notification", icon: iconMap.notification },
  { label: "Update Content", icon: iconMap.update },
  { label: "User Action", icon: iconMap.useraction },
  { label: "Wait for Content Update", icon: iconMap.wait },
];

export default function PlaybackEngine({ steps, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedNode, setSelectedNode] = useState<number | null>(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialFitDone, setInitialFitDone] = useState(false);
  const [renderTrigger, setRenderTrigger] = useState(0);

  const { nodePositions, arrowPaths } = calculateLayout(steps);
  const step = selectedNode !== null ? steps[selectedNode] : null;
  const action = (step?.action || "").toLowerCase();

  /* ================= AUTO ADVANCE ================= */
  useEffect(() => {
    const currentStepObj = steps[currentStep];
    if (!currentStepObj) return;
    
    const currentAction = (currentStepObj.action || "").toLowerCase();
    if (!isPlaying || currentAction === "stop") return;

    const timer = setTimeout(() => {
      let nextIdx = -1;
      
      if (currentAction === "condition") {
        if (currentStepObj.trueStep !== undefined && currentStepObj.trueStep !== "") {
          nextIdx = Number(currentStepObj.trueStep) - 1;
        } else if (currentStepObj.defaultStep !== undefined && currentStepObj.defaultStep !== "") {
          nextIdx = Number(currentStepObj.defaultStep) - 1;
        }
      } else {
        if (currentStep < steps.length - 1) {
          nextIdx = currentStep + 1;
        }
      }

      if (nextIdx !== -1 && nextIdx < steps.length && nextIdx !== currentStep) {
        setCurrentStep(nextIdx);
        setSelectedNode(nextIdx);
      } else {
        setIsPlaying(false);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [currentStep, isPlaying, steps]);

  useEffect(() => {
    const handleResize = () => setZoom(z => z); // force re-render on resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* ================= FIT TO SCREEN ================= */
  useEffect(() => {
    if (initialFitDone || !canvasRef.current || nodePositions.length === 0) return;
    const canvas = canvasRef.current;
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pos of nodePositions) {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + pos.width);
      maxY = Math.max(maxY, pos.y + pos.height);
    }

    const padding = 100;
    minX -= padding; minY -= padding;
    maxX += padding; maxY += padding;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const scaleX = rect.width / contentWidth;
    const scaleY = rect.height / contentHeight;
    const targetZoom = Math.min(scaleX, scaleY, 1);
    
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;
    const targetPanX = (rect.width / 2) - (contentCenterX * targetZoom);
    const targetPanY = (rect.height / 2) - (contentCenterY * targetZoom);

    setZoom(targetZoom);
    setPan({ x: targetPanX, y: targetPanY });
    setInitialFitDone(true);
  }, [nodePositions, initialFitDone]);

  /* ================= CANVAS RENDERING ================= */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;

    const rect = canvas.parentElement.getBoundingClientRect();
    if (canvas.width !== rect.width) canvas.width = rect.width;
    if (canvas.height !== rect.height) canvas.height = rect.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas with light background
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save context for transforms
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw grid
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 0.8;
    
    const gridSize = 50;
    const left = -pan.x / zoom;
    const top = -pan.y / zoom;
    const right = (canvas.width - pan.x) / zoom;
    const bottom = (canvas.height - pan.y) / zoom;

    const startX = Math.floor(left / gridSize) * gridSize;
    const startY = Math.floor(top / gridSize) * gridSize;

    for (let x = startX; x < right; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }
    for (let y = startY; y < bottom; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }

    // Draw transition nodes
    drawTransitionNodes(ctx, arrowPaths);

    // Draw nodes (only icons, no background or labels)
    for (let i = 0; i < nodePositions.length; i++) {
      const pos = nodePositions[i];
      const nodeStep = steps[pos.stepIndex];
      const nodeAction = (nodeStep.action || "").toLowerCase();

      // Highlight current step
      if (pos.stepIndex === currentStep) {
        ctx.beginPath();
        ctx.arc(pos.x + pos.width / 2, pos.y + pos.height / 2, 55, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(211, 84, 0, 0.2)";
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#d35400";
        ctx.stroke();
      }

      // Icon
      const icon = new Image();
      // Only the first step gets the Start icon if it's unconfigured. Others get a generic neutral icon.
      icon.src = iconMap[nodeAction] || (pos.stepIndex === 0 ? startIcon : textIcon);
      if (icon.complete) {
        ctx.drawImage(
          icon,
          pos.x + 10,
          pos.y + 10,
          pos.width - 20,
          pos.height - 20
        );
      } else {
        // Fix ghost icon UI bug: trigger a full React re-render instead of painting async directly
        icon.onload = () => {
          setRenderTrigger(prev => prev + 1);
        };
      }

      // Draw Labels beneath the node
      ctx.fillStyle = "#333";
      ctx.font = "bold 11px Arial";
      ctx.textAlign = "center";
      
      let textY = pos.y + pos.height + 18;
      
      if (nodeAction === "condition" && nodeStep.rules && nodeStep.rules.length > 0) {
        // Display Condition Rules with AND/OR
        nodeStep.rules.forEach((r, rIdx) => {
          const prefix = rIdx > 0 ? `${r.logic || "AND"} ` : "IF ";
          const val = r.fieldType === "date" ? (r.dateOption === "specific" || r.dateOption === "days" ? r.value : r.dateOption) : r.value;
          const text = `${prefix}${r.fieldName} ${r.operator} ${val || ""}`;
          ctx.fillText(text, pos.x + pos.width / 2, textY);
          textY += 14;
        });
      } else {
        // Display generic action name, preventing "Start" from duplicating
        const displayLabel = nodeAction === "" ? (pos.stepIndex === 0 ? "Start" : "New Step") : (nodeStep.action || "Start");
        ctx.fillText(displayLabel, pos.x + pos.width / 2, textY);
      }
    }

    ctx.restore();

  }, [nodePositions, arrowPaths, steps, currentStep, selectedNode, zoom, pan, renderTrigger]);

  /* ================= ZOOM HANDLERS ================= */
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.5, Math.min(3, prev * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) { // Right click for pan
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else {
      // Check if clicked on a node
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - pan.x) / zoom;
        const y = (e.clientY - rect.top - pan.y) / zoom;

        let clickedNode: number | null = null;
        for (const pos of nodePositions) {
          if (
            x >= pos.x &&
            x <= pos.x + pos.width &&
            y >= pos.y &&
            y <= pos.y + pos.height
          ) {
            clickedNode = pos.stepIndex;
            break;
          }
        }
        setSelectedNode(clickedNode);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  /* ================= GET DISPLAY TEXT ================= */
  const getNodeDetails = () => {
    if (selectedNode === null) return null;
    const nodeStep = steps[selectedNode];
    if (!nodeStep) return null;

    return {
      action: nodeStep.action,
      fields: nodeStep.fields,
      rules: nodeStep.rules,
      trueStep: nodeStep.trueStep,
      defaultStep: nodeStep.defaultStep
    };
  };

  const details = getNodeDetails();

  return (
    <div className="fixed top-16 left-72 right-0 bottom-0 flex items-stretch bg-gray-100 font-sans overflow-hidden z-40">
      {/* ================= LEFT PANEL ================= */}
      <div className="w-64 h-full bg-[#333333] text-gray-300 flex flex-col border-r border-black shadow-xl z-10 overflow-y-auto shrink-0 select-none">
        <div className="py-2">
          {leftMenuItems.map((item, idx) => (
            <div key={idx} className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${item.active ? 'bg-[#d35400] text-white' : 'hover:bg-[#444]'}`}>
              <img src={item.icon} alt={item.label} className="w-5 h-5 object-contain brightness-0 invert" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          ))}
        </div>
        
        <div className="bg-[#222222] px-4 py-2 mt-2 flex justify-between items-center text-xs font-bold tracking-wider text-gray-400 cursor-pointer">
          GENERAL
          <span className="text-[10px]">▲</span>
        </div>
        
        <div className="py-2">
          {generalItems.map((item, idx) => (
            <div key={idx} className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${item.active ? 'bg-[#d35400] text-white' : 'hover:bg-[#444]'}`}>
              <img src={item.icon} alt={item.label} className="w-5 h-5 object-contain brightness-0 invert" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ================= CANVAS AREA ================= */}
      <div className="flex-1 flex flex-col relative bg-white">
        <div className="absolute bottom-12 left-4 z-10 bg-white p-3 rounded-lg shadow flex gap-2 items-center">
          <button
            onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
          >
            − Zoom Out
          </button>
          <span className="px-3 py-1 text-sm font-semibold">{(zoom * 100).toFixed(0)}%</span>
          <button
            onClick={() => setZoom(prev => Math.min(3, prev + 0.1))}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
          >
            + Zoom In
          </button>
          <button
            onClick={() => {
              setInitialFitDone(false);
            }}
            className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
          >
            Fit to Screen
          </button>
        </div>

        <canvas
          ref={canvasRef}
          className="flex-1 w-full h-full bg-gray-50 cursor-grab active:cursor-grabbing block"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
        />
        
        <div className="text-xs text-gray-500 p-2 text-center absolute bottom-0 w-full bg-white/80">
          Left Click: Select Node | Right Click + Drag: Pan | Scroll: Zoom
        </div>
      </div>

      {/* ================= RIGHT PANEL ================= */}
      <div className="w-80 h-full bg-[#333333] text-gray-300 flex flex-col border-l border-black shadow-xl z-10 overflow-y-auto shrink-0">
        {!details ? (
          <div className="p-4 space-y-6 text-sm">
            <p className="text-gray-300 leading-relaxed text-sm">
              The advanced workflow process is the blueprint where you define logic nodes and transitions how a record should move through the steps of your business process. Use the Process Properties section to define how content gets enrolled and whether your advanced workflow is active.
            </p>
            
            <div className="grid grid-cols-2 gap-y-2 text-gray-400 text-xs uppercase font-semibold">
              <div>ID</div>
              <div className="text-white normal-case text-sm font-normal">5237CUST</div>
              <div>Process Version</div>
              <div className="text-white normal-case text-sm font-normal">1</div>
            </div>

            {/* SETTINGS */}
            <div>
              <div className="bg-[#222] px-4 py-2 flex justify-between items-center text-xs font-bold tracking-wider text-gray-400 -mx-4 mb-3 cursor-pointer">
                SETTINGS
                <span className="text-[10px]">▲</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
                <input type="checkbox" className="w-4 h-4 accent-[#d35400] bg-[#222] border-[#555] rounded" />
                <span>Allow Re-Enrollment</span>
              </label>
            </div>

            {/* CONTENT ENROLLMENT */}
            <div>
              <div className="bg-[#222] px-4 py-2 flex justify-between items-center text-xs font-bold tracking-wider text-gray-400 -mx-4 mb-3 cursor-pointer">
                CONTENT ENROLLMENT
                <span className="text-[10px]">▲</span>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
                  <input type="checkbox" className="w-4 h-4 accent-[#d35400]" />
                  <span>New Records</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
                  <input type="checkbox" className="w-4 h-4 accent-[#d35400]" />
                  <span>Updated Records</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#d35400]" />
                  <span>User Initiated</span>
                </label>
                
                <div className="pl-6 space-y-4 mt-2 text-gray-400">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Button Text</span>
                    <input type="text" value="Submit" className="bg-[#222] border border-[#555] px-2 py-1.5 w-32 text-white text-sm focus:outline-none focus:border-[#d35400] rounded" readOnly />
                  </div>
                  <div>
                    <div className="mb-1 uppercase text-[10px] font-bold tracking-wider">Rule</div>
                    <input type="text" className="bg-[#222] border border-[#555] w-full px-2 py-1.5 text-white text-sm focus:outline-none focus:border-[#d35400] rounded" readOnly />
                  </div>
                  <div>
                    <div className="mb-1 uppercase text-[10px] font-bold tracking-wider">Submit Button Permission</div>
                    <select className="bg-[#222] border border-[#555] w-full px-2 py-1.5 text-white text-sm focus:outline-none focus:border-[#d35400] rounded">
                      <option>None</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* AUDIT SETTINGS */}
            <div>
              <div className="bg-[#222] px-4 py-2 flex justify-between items-center text-xs font-bold tracking-wider text-gray-400 -mx-4 mb-3 cursor-pointer">
                AUDIT SETTINGS
                <span className="text-[10px]">▲</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="bg-[#222] px-4 py-2 flex justify-between items-center text-xs font-bold tracking-wider text-gray-400 -mx-4 mb-3">
              NODE DETAILS
              <span className="text-[10px]">▲</span>
            </div>
            
            {/* ACTION TYPE */}
            <div className="bg-[#444] p-3 rounded-lg border border-[#555]">
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                Action Type
              </label>
              <div className="flex items-center gap-3">
                <img
                  src={iconMap[action] || startIcon}
                  alt={action}
                  className="w-10 h-10 bg-[#222] p-2 rounded border border-[#555] brightness-0 invert"
                />
                <span className="text-base font-bold text-white uppercase tracking-wide">
                  {details.action}
                </span>
              </div>
            </div>

            {/* UPDATE FIELDS */}
            {action === "update" && details.fields && details.fields.length > 0 && (
              <div className="bg-[#444] p-3 rounded-lg border border-[#555]">
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                  Update Fields ({details.fields.length})
                </label>
                <div className="space-y-2">
                  {details.fields.map((field, idx) => (
                    <div key={idx} className="bg-[#333] p-2 rounded border-l-4 border-blue-500 shadow-sm">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-blue-400 mb-1">Type: {field.type}</div>
                      <div className="text-sm text-gray-200">Field: {field.fieldName}</div>
                      <div className="text-sm text-gray-400">
                        Value: {
                          field.type === "date"
                            ? field.dateOption === "current"
                              ? "Current Date"
                              : field.dateOption === "days"
                              ? `+${field.value} Days`
                              : field.dateOption === "specific"
                              ? field.value
                              : "—"
                            : field.value || "—"
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CONDITIONS */}
            {action === "condition" && details.rules && details.rules.length > 0 && (
              <div className="bg-[#444] p-3 rounded-lg border border-[#555]">
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                  Conditions ({details.rules.length})
                </label>
                <div className="space-y-2">
                  {details.rules.map((rule, idx) => (
                    <div key={idx} className="bg-[#333] p-2 rounded border-l-4 border-yellow-500 shadow-sm">
                      {idx > 0 && (
                        <div className="text-[10px] font-bold text-yellow-500 mb-1">
                          {rule.logic || "AND"}
                        </div>
                      )}
                      <div className="text-[10px] font-bold uppercase tracking-wider text-yellow-400 mb-1">Type: {rule.fieldType}</div>
                      <div className="text-sm text-gray-200">Field: {rule.fieldName}</div>
                      <div className="text-sm text-gray-200">Operator: {rule.operator}</div>
                      <div className="text-sm text-gray-400">
                        Value: {
                          rule.fieldType === "date"
                            ? rule.dateOption === "current"
                              ? "Current"
                              : rule.dateOption === "days"
                              ? `${rule.value} Days`
                              : rule.dateOption === "specific"
                              ? rule.value
                              : "—"
                            : rule.value || "—"
                        }
                      </div>
                    </div>
                  ))}
                </div>

                {/* DECISION PATHS */}
                <div className="mt-4 space-y-2">
                  <div className="bg-[#333] p-2 rounded border border-green-500 shadow-sm">
                    <div className="text-xs font-bold text-green-400">
                      IF TRUE → Step {details.trueStep || "—"}
                    </div>
                  </div>
                  <div className="bg-[#333] p-2 rounded border border-red-500 shadow-sm">
                    <div className="text-xs font-bold text-red-400">
                      DEFAULT → Step {details.defaultStep || "—"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATION/LAUNCH */}
            {(action === "notification" || action === "launch" || action === "useraction") &&
              details.fields &&
              details.fields.length > 0 && (
                <div className="bg-[#444] p-3 rounded-lg border border-[#555]">
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                    {action === "notification"
                      ? "Notification"
                      : action === "launch"
                      ? "Launch Event"
                      : "User Action"}
                  </label>
                  <div className="bg-[#333] p-2 rounded border-l-4 border-purple-500 shadow-sm">
                    <div className="text-sm text-gray-200">
                      {details.fields[0].value || "—"}
                    </div>
                  </div>
                </div>
              )}

            {/* TEXT NODE */}
            {action === "text" && (
              <div className="bg-[#444] p-3 rounded-lg border border-[#555]">
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                  Text Content
                </label>
                <div className="bg-[#333] p-2 rounded text-sm text-gray-200 shadow-sm">
                  {details.fields?.[0]?.value || "—"}
                </div>
              </div>
            )}

            {/* LAYOUT NODE */}
            {action === "layout" && (
              <div className="bg-[#444] p-3 rounded-lg border border-[#555]">
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                  Layout Name
                </label>
                <div className="bg-[#333] p-2 rounded text-sm text-gray-200 shadow-sm">
                  {details.fields?.[0]?.value || "—"}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= CONTROLS ================= */}
        <div className="border-t border-[#222] p-4 bg-[#2b2b2b] mt-auto space-y-2 shrink-0">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`w-full px-4 py-2 rounded text-white font-semibold transition shadow-sm ${
              isPlaying
                ? "bg-yellow-600 hover:bg-yellow-700"
                : "bg-[#d35400] hover:bg-[#e67e22]"
            }`}
          >
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>

          <button
            onClick={onExit}
            className="w-full bg-red-600 text-white px-4 py-2 rounded font-semibold hover:bg-red-700 transition shadow-sm"
          >
            ✕ Exit Workflow
          </button>
        </div>
      </div>
    </div>
  );
}
