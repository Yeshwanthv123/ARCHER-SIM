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
  isDotted?: boolean;
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
      marginx: 80,
      marginy: 80,
      nodesep: 120, // Tight vertical spacing
      ranksep: 180, // Tight horizontal spacing
      edgesep: 40,
      ranker: "network-simplex",
      acyclicer: "greedy"
    });
    g.setDefaultEdgeLabel(() => ({}));

    steps.forEach((_, i) => {
      g.setNode(String(i), { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    const arrows: ArrowPath[] = [];
    steps.forEach((step, i) => {
      const action = (step.action || "").toLowerCase();
      if (action === "condition" || action === "useraction") {
        let hasBranch = false;
        if (step.rules && step.rules.length > 0) {
          step.rules.forEach((rule, ruleIdx) => {
            if (rule.trueStep !== undefined && rule.trueStep !== "") {
              const to = Number(rule.trueStep) - 1;
              if (to >= 0 && to < steps.length) {
                // Ensure we don't push duplicates if multiple rules point to same step
                if (!arrows.find(a => a.from === i && a.to === to)) {
                  const label = action === "useraction" 
                    ? (rule.value || `Option ${ruleIdx + 1}`) 
                    : `IF C${ruleIdx+1} TRUE`;
                  arrows.push({ from: i, to, label, isTrue: true, weight: 2 });
                  hasBranch = true;
                }
              }
            }
          });
        }
        if (step.defaultStep !== undefined && step.defaultStep !== "") {
          const to = Number(step.defaultStep) - 1;
          if (to >= 0 && to < steps.length) {
            arrows.push({ from: i, to, label: "DEFAULT", isTrue: false, weight: 2 });
            hasBranch = true;
          }
        }
        
        // Fallback for useraction if it has no branches or default step configured
        if (!hasBranch && action === "useraction" && i + 1 < steps.length) {
          arrows.push({ from: i, to: i + 1, label: "", weight: 3 });
        }
      } else if (action === "wait") {
        // Find the correct condition node that leads to this wait node by tracing back the graph
        let conditionNodeIndex = -1;
        let curr = i;
        const visited = new Set<number>();
        
        while (curr !== -1) {
          if (visited.has(curr)) break;
          visited.add(curr);
          
          const incomingArrows = arrows.filter(a => a.to === curr);
          if (incomingArrows.length > 0) {
            // Check if any incoming arrow is from a condition node
            const conditionParent = incomingArrows.find(a => (steps[a.from]?.action || "").toLowerCase() === "condition");
            if (conditionParent) {
              conditionNodeIndex = conditionParent.from;
              break;
            }
            // Otherwise follow the path backwards
            curr = incomingArrows[0].from;
          } else {
            break;
          }
        }
        
        // Fallback: If not found via graph edges (e.g. unconfigured condition branches),
        // just find the closest previous condition in the steps array.
        if (conditionNodeIndex === -1) {
          for (let j = i - 1; j >= 0; j--) {
            if ((steps[j]?.action || "").toLowerCase() === "condition") {
              conditionNodeIndex = j;
              break;
            }
          }
        }
        
        // Draw dotted line back to the condition
        if (conditionNodeIndex !== -1) {
          arrows.push({ from: i, to: conditionNodeIndex, label: "", isDotted: true, weight: 1 });
        }
        
        // Continue to next step
        if (i + 1 < steps.length) {
          arrows.push({ from: i, to: i + 1, label: "", weight: 3 });
        }
      } else if (action !== "stop" && i + 1 < steps.length) {
        // Higher weight for the main sequence ensures it stays straight
        arrows.push({ from: i, to: i + 1, label: "", weight: 3 });
      }
    });

    arrows.forEach((arrow, idx) => {
      g.setEdge(String(arrow.from), String(arrow.to), { 
        label: arrow.label, 
        weight: arrow.weight || 1,
        minlen: 2
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
        // Add a layout-only edge from the PREVIOUS node to this disconnected node 
        // to ensure they are visually laid out sequentially from left to right.
        // weight must be > 0 to prevent Dagre greedy acyclicer crashes on cycles.
        g.setEdge(String(i - 1), String(i), { weight: 1, minlen: 2 }, `hidden_${i}`);
      }
    }

    dagreInstance.layout(g);

    const nodePositions: NodePosition[] = steps.map((_, i) => {
      const node = g.node(String(i));
      // Safeguard against Dagre returning undefined or NaN for node coordinates (e.g. self-loops)
      const validX = node && typeof node.x === 'number' && !isNaN(node.x);
      const validY = node && typeof node.y === 'number' && !isNaN(node.y);
      return {
        x: validX ? node.x - NODE_WIDTH / 2 : i * (NODE_WIDTH + 150),
        y: validY ? node.y - NODE_HEIGHT / 2 : 100,
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
    // Robust fallback: Layout nodes in a simple horizontal line so the canvas never goes completely blank
    const fallbackPositions = steps.map((_, i) => ({
      x: i * (NODE_WIDTH + 150),
      y: 100,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      stepIndex: i
    }));
    return { nodePositions: fallbackPositions, arrowPaths: [] };
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
    
    // Set dotted line style if needed
    if (arrow.isDotted) {
      ctx.setLineDash([5, 5]);
    } else {
      ctx.setLineDash([]);
    }
    
    // Generate strict orthogonal points from Dagre points
    const orthoPts = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const prev = orthoPts[orthoPts.length - 1];
      const curr = pts[i];
      
      // If the segment is diagonal, add an intermediate corner to make it orthogonal.
      // Usually in LR rankdir, moving horizontally first is standard.
      if (Math.abs(curr.x - prev.x) > 1 && Math.abs(curr.y - prev.y) > 1) {
        orthoPts.push({ x: curr.x, y: prev.y });
      }
      orthoPts.push(curr);
    }

    ctx.beginPath();
    ctx.moveTo(orthoPts[0].x, orthoPts[0].y);

    // Draw with small 5px rounded corners at the 90-degree turns
    for (let i = 1; i < orthoPts.length - 1; i++) {
      const p0 = orthoPts[i - 1];
      const p1 = orthoPts[i];
      const p2 = orthoPts[i + 1];
      
      const dist1 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      const dist2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const radius = Math.min(5, dist1 / 2, dist2 / 2); // 5px radius for sharp orthogonal look
      
      ctx.arcTo(p1.x, p1.y, p2.x, p2.y, radius);
    }
    ctx.lineTo(orthoPts[orthoPts.length - 1].x, orthoPts[orthoPts.length - 1].y);
    ctx.stroke();
    
    // Reset line dash for arrow head
    ctx.setLineDash([]);

    // Draw arrow head at the end
    // Calculate angle from the last segment
    const pPrev = orthoPts.length > 1 ? orthoPts[orthoPts.length - 2] : orthoPts[0];
    const pEnd = orthoPts[orthoPts.length - 1];
    
    let dx = pEnd.x - pPrev.x;
    let dy = pEnd.y - pPrev.y;
    
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
      const midPoint = orthoPts[Math.floor(orthoPts.length / 2)];
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

const getLeftMenuItems = (selectedNode: number | null, isPlaying: boolean, onStartClick: () => void, onStopClick: () => void) => [
  { label: "Start", icon: iconMap.start, onClick: onStartClick, disabled: selectedNode === null },
  { label: "Stop", icon: iconMap.stop, onClick: onStopClick, disabled: !isPlaying },
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
  const [activeNodes, setActiveNodes] = useState<number[]>([0]);
  const [visitedNodes, setVisitedNodes] = useState<Set<number>>(new Set([0]));
  const [selectedNode, setSelectedNode] = useState<number | null>(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [initialFitDone, setInitialFitDone] = useState(false);
  const [renderTrigger, setRenderTrigger] = useState(0);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [editModalType, setEditModalType] = useState<"field" | "rule" | "text" | "layout" | null>(null);

  const { nodePositions, arrowPaths } = calculateLayout(steps);
  const step = selectedNode !== null ? steps[selectedNode] : null;
  const action = (step?.action || "").toLowerCase();

  /* ================= AUTO ADVANCE (PARALLEL BRANCH EXPLORATION) ================= */
  useEffect(() => {
    if (!isPlaying || activeNodes.length === 0) return;

    const timer = setTimeout(() => {
      let nextNodes = new Set<number>();

      activeNodes.forEach(nodeIdx => {
        const currentStepObj = steps[nodeIdx];
        if (!currentStepObj) return;
        
        const currentAction = (currentStepObj.action || "").toLowerCase();
        
        if (currentAction === "stop") {
          // This branch terminates. Do not add any next nodes for it.
          return;
        }

        if (currentAction === "condition" || currentAction === "useraction") {
          let hasBranch = false;
          if (currentStepObj.rules && currentStepObj.rules.length > 0) {
            currentStepObj.rules.forEach(rule => {
              if (rule.trueStep !== undefined && rule.trueStep !== "") {
                nextNodes.add(Number(rule.trueStep) - 1);
                hasBranch = true;
              }
            });
          }
          if (currentStepObj.defaultStep !== undefined && currentStepObj.defaultStep !== "") {
            nextNodes.add(Number(currentStepObj.defaultStep) - 1);
            hasBranch = true;
          }
          if (!hasBranch && currentAction === "useraction" && nodeIdx + 1 < steps.length) {
            nextNodes.add(nodeIdx + 1);
          }
        } else if (currentAction === "wait") {
          if (nodeIdx + 1 < steps.length) {
            nextNodes.add(nodeIdx + 1);
          }
        } else {
          if (nodeIdx + 1 < steps.length) {
            nextNodes.add(nodeIdx + 1);
          }
        }
      });

      const nextNodesArr = Array.from(nextNodes).filter(idx => idx >= 0 && idx < steps.length && !visitedNodes.has(idx));
      
      if (nextNodesArr.length > 0) {
        setActiveNodes(nextNodesArr);
        setVisitedNodes(prev => {
          const nextSet = new Set(prev);
          nextNodesArr.forEach(idx => nextSet.add(idx));
          return nextSet;
        });
        setSelectedNode(nextNodesArr[0]);
      } else {
        setIsPlaying(false);
        setActiveNodes([]); // Clear active nodes when stopped
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [activeNodes, isPlaying, steps, visitedNodes]);

  useEffect(() => {
    const handleResize = () => setZoom(z => z); // force re-render on resize
    window.addEventListener('resize', handleResize);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
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
    let targetZoom = Math.min(scaleX, scaleY, 1);
    
    // Bulletproof shield against NaN propagation freezing the UI
    if (isNaN(targetZoom) || !isFinite(targetZoom) || targetZoom <= 0) {
      targetZoom = 1;
    }
    
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;
    
    let targetPanX = (rect.width / 2) - (contentCenterX * targetZoom);
    let targetPanY = (rect.height / 2) - (contentCenterY * targetZoom);
    
    if (isNaN(targetPanX) || !isFinite(targetPanX)) targetPanX = 0;
    if (isNaN(targetPanY) || !isFinite(targetPanY)) targetPanY = 0;

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

    // Filter visible arrows (only show arrows where both nodes have been visited)
    const visibleArrows = arrowPaths.filter(arrow => visitedNodes.has(arrow.from) && visitedNodes.has(arrow.to));
    
    // Draw transition nodes
    drawTransitionNodes(ctx, visibleArrows);

    // Draw nodes (only icons, no background or labels) - only visited nodes
    for (let i = 0; i < nodePositions.length; i++) {
      if (!visitedNodes.has(i)) continue;
      
      const pos = nodePositions[i];
      
      // Removed visibility filter so branching tree is fully visible
      const nodeStep = steps[pos.stepIndex];
      const nodeAction = (nodeStep.action || "").toLowerCase();

      // Highlight active step
      if (activeNodes.includes(pos.stepIndex)) {
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
        // Layout nodes display as Evaluate Content
        let displayLabel = nodeAction === "" ? (pos.stepIndex === 0 ? "Start" : "New Step") : (nodeStep.action || "Start");
        if (nodeAction === "layout") {
          displayLabel = "Evaluate Content";
        }
        ctx.fillText(displayLabel, pos.x + pos.width / 2, textY);
      }
    }

    ctx.restore();

  }, [nodePositions, arrowPaths, steps, activeNodes, visitedNodes, selectedNode, zoom, pan, renderTrigger]);

  /* ================= ZOOM HANDLERS ================= */
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.5, Math.min(3, prev * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Pan with spacebar + left click or middle click
    if (isSpacePressed || e.button === 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (e.button === 0) {
      // Left click to select nodes or pan if empty space
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

        // If no node was clicked, initiate panning
        if (clickedNode === null) {
          setIsDragging(true);
          setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
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

  /* ================= EDIT HANDLERS ================= */
  const openEditFieldModal = (field: Field) => {
    setEditingField({ ...field });
    setEditModalType("field");
    setShowEditModal(true);
  };

  const openEditRuleModal = (rule: Rule) => {
    setEditingRule({ ...rule });
    setEditModalType("rule");
    setShowEditModal(true);
  };

  const openEditTextModal = (field: Field) => {
    setEditingField({ ...field });
    setEditModalType("text");
    setShowEditModal(true);
  };

  const openEditLayoutModal = (field: Field) => {
    setEditingField({ ...field });
    setEditModalType("layout");
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingField(null);
    setEditingRule(null);
    setEditModalType(null);
  };

  /* ================= PLAYBACK CONTROLS ================= */
  const handleStartFromNode = () => {
    if (selectedNode !== null) {
      setActiveNodes([selectedNode]);
      
      // We must completely rebuild the visited nodes up to the selected node.
      // This ensures any "future" nodes from a previous playback are wiped out,
      // so the auto-advance logic doesn't think they've already been visited and stop immediately.
      const newVisited = new Set<number>();
      for (let i = 0; i <= selectedNode; i++) {
        newVisited.add(i);
      }
      setVisitedNodes(newVisited);
      
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
  };

  const leftMenuItems = getLeftMenuItems(selectedNode, isPlaying, handleStartFromNode, handleStop);

  return (
    <div className="fixed top-16 left-72 right-0 bottom-0 flex items-stretch bg-gray-100 font-sans overflow-hidden z-40">
      {/* ================= LEFT PANEL ================= */}
      <div className="w-64 h-full bg-[#333333] text-gray-300 flex flex-col border-r border-black shadow-xl z-10 overflow-y-auto shrink-0 select-none">
        <div className="py-2">
          {leftMenuItems.map((item, idx) => (
            <div key={idx} onClick={item.onClick} className={`flex items-center gap-3 px-4 py-2 transition-colors ${
              item.disabled 
                ? 'opacity-50 cursor-not-allowed' 
                : 'cursor-pointer ' + (item.active ? 'bg-[#d35400] text-white hover:bg-[#e67e22]' : 'hover:bg-[#444]')
            }`}>
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
                  {action === "layout" ? "EVALUATE CONTENT" : details.action}
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
                    <div key={idx} className="bg-[#333] p-2 rounded border-l-4 border-blue-500 shadow-sm flex items-start justify-between group">
                      <div className="flex-1">
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
                      <button
                        onClick={() => openEditFieldModal(field)}
                        className="ml-2 p-1 text-black hover:text-[#d35400] transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit field"
                      >
                        ✏️
                      </button>
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
                <div className="space-y-3">
                  {details.rules.map((rule, idx) => (
                    <div key={idx}>
                      {/* Condition Rule */}
                      <div className="bg-[#333] p-3 rounded border-l-4 border-yellow-500 shadow-sm flex items-start justify-between group relative">
                        <div className="flex-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-yellow-400 mb-2">Type: {rule.fieldType}</div>
                          <div className="text-sm text-gray-200 mb-1">Field: {rule.fieldName}</div>
                          <div className="text-sm text-gray-200 mb-1">Operator: {rule.operator}</div>
                          <div className="text-sm text-gray-400 mb-3">
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
                          
                          {(!rule.logic || rule.logic === "") ? (
                            <div className="bg-[#222] p-2 rounded border border-green-500/50 shadow-sm mt-2 inline-block w-full">
                              <div className="text-xs font-bold text-green-400">
                                → IF TRUE: Step {rule.trueStep || "—"}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center font-black text-blue-400 text-xl border-2 border-dashed border-blue-500/50 bg-blue-900/20 rounded mt-2 p-2">
                              {rule.logic}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => openEditRuleModal(rule)}
                          className="ml-2 p-1 text-black hover:text-[#d35400] transition-colors opacity-0 group-hover:opacity-100 self-center"
                          title="Edit rule"
                        >
                          ✏️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* DECISION PATHS */}
                <div className="mt-4 space-y-2">
                  <div className="bg-[#333] p-2 rounded border border-red-500 shadow-sm">
                    <div className="text-xs font-bold text-red-400">
                      DEFAULT → Step {details.defaultStep || "—"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATION/LAUNCH/USERACTION/WAIT */}
            {(action === "notification" || action === "launch" || action === "useraction" || action === "wait") &&
              details.fields &&
              details.fields.length > 0 && (
                <div className="bg-[#444] p-3 rounded-lg border border-[#555]">
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                    {action === "notification"
                      ? "Notification"
                      : action === "launch"
                      ? "Launch Event"
                      : action === "useraction"
                      ? "User Action Name"
                      : "Wait for Content Update"}
                  </label>
                  <div className="bg-[#333] p-2 rounded border-l-4 border-purple-500 shadow-sm flex items-center justify-between group">
                    <div className="text-sm text-gray-200 flex-1">
                      {details.fields[0].value || "—"}
                    </div>
                    <button
                      onClick={() => openEditTextModal(details.fields[0])}
                      className="ml-2 p-1 text-black hover:text-[#d35400] transition-colors opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      ✏️
                    </button>
                  </div>

                  {/* USER ACTION BRANCHES */}
                  {action === "useraction" && details.rules && details.rules.length > 0 && (
                    <div className="mt-4">
                      <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                        Action Options
                      </label>
                      <div className="space-y-2">
                        {details.rules.map((rule, idx) => (
                          <div key={idx} className="bg-[#333] p-2 rounded border-l-4 border-green-500 shadow-sm flex flex-col gap-1">
                            <div className="text-sm text-gray-200">
                              Option: <span className="font-semibold">{rule.value || `Option ${idx + 1}`}</span>
                            </div>
                            <div className="text-xs text-green-400 font-bold">
                              → GO TO STEP {rule.trueStep || "—"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {action === "useraction" && details.defaultStep && (
                     <div className="mt-2 bg-[#333] p-2 rounded border border-red-500 shadow-sm">
                       <div className="text-xs font-bold text-red-400">
                         DEFAULT → Step {details.defaultStep}
                       </div>
                     </div>
                  )}
                </div>
              )}

            {/* TEXT NODE */}
            {action === "text" && (
              <div className="bg-[#444] p-3 rounded-lg border border-[#555]">
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                  Text Content
                </label>
                <div className="bg-[#333] p-2 rounded text-sm text-gray-200 shadow-sm flex items-center justify-between group">
                  <span className="flex-1">{details.fields?.[0]?.value || "—"}</span>
                  <button
                    onClick={() => openEditTextModal(details.fields?.[0] || { type: "text", fieldName: "", value: "" })}
                    className="ml-2 p-1 text-black hover:text-[#d35400] transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit"
                  >
                    ✏️
                  </button>
                </div>
              </div>
            )}

            {/* LAYOUT NODE */}
            {action === "layout" && (
              <div className="bg-[#444] p-3 rounded-lg border border-[#555]">
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                  Evaluate Content
                </label>
                <div className="bg-[#333] p-2 rounded text-sm text-gray-200 shadow-sm flex items-center justify-between group">
                  <span className="flex-1">{details.fields?.[0]?.value || "—"}</span>
                  <button
                    onClick={() => openEditLayoutModal(details.fields?.[0] || { type: "layout", fieldName: "", value: "" })}
                    className="ml-2 p-1 text-black hover:text-[#d35400] transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit"
                  >
                    ✏️
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= CONTROLS ================= */}
        <div className="border-t border-[#222] p-4 bg-[#2b2b2b] mt-auto space-y-2 shrink-0">
          <button
            onClick={() => {
              if (isPlaying) {
                setIsPlaying(false);
              } else {
                if (activeNodes.length === 0) {
                  // If finished, restart from selected node or 0
                  const startNode = selectedNode !== null ? selectedNode : 0;
                  setActiveNodes([startNode]);
                  
                  const newVisited = new Set<number>();
                  for (let i = 0; i <= startNode; i++) {
                    newVisited.add(i);
                  }
                  setVisitedNodes(newVisited);
                }
                setIsPlaying(true);
              }
            }}
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

      {/* ================= EDIT MODAL ================= */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-96">
            {editModalType === "field" && editingField && (
              <>
                <div className="bg-[#d35400] text-white px-6 py-4 rounded-t-lg">
                  <h2 className="text-lg font-bold">Edit Field Value</h2>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-gray-600 text-sm">
                    Select the Text Field and then enter the value for that field
                  </p>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Field
                    </label>
                    <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600">
                      {editingField.fieldName}
                    </div>
                  </div>

                  {editingField.type === "date" ? (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Date Option
                        </label>
                        <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600">
                          {editingField.dateOption === "current"
                            ? "Current Date"
                            : editingField.dateOption === "days"
                            ? "Days Offset"
                            : editingField.dateOption === "specific"
                            ? "Specific Date"
                            : "—"}
                        </div>
                      </div>

                      {(editingField.dateOption === "days" || editingField.dateOption === "specific") && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Value
                          </label>
                          <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600">
                            {editingField.value || "—"}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Value
                      </label>
                      <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600">
                        {editingField.value || "—"}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={closeEditModal}
                      className="px-4 py-2 bg-[#d35400] text-white rounded-md hover:bg-[#e67e22] font-semibold"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            )}

            {editModalType === "rule" && editingRule && (
              <>
                <div className="bg-[#d35400] text-white px-6 py-4 rounded-t-lg">
                  <h2 className="text-lg font-bold">Edit Condition</h2>
                </div>
                <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                  <p className="text-gray-600 text-sm">
                    Edit the condition values
                  </p>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Field Type
                    </label>
                    <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600">
                      {editingRule.fieldType}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Field Name
                    </label>
                    <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600">
                      {editingRule.fieldName}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Operator
                    </label>
                    <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600">
                      {editingRule.operator}
                    </div>
                  </div>

                  {editingRule.fieldType === "date" ? (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Date Option
                        </label>
                        <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600">
                          {editingRule.dateOption === "current"
                            ? "Current"
                            : editingRule.dateOption === "days"
                            ? "Days Offset"
                            : editingRule.dateOption === "specific"
                            ? "Specific Date"
                            : "—"}
                        </div>
                      </div>

                      {(editingRule.dateOption === "days" || editingRule.dateOption === "specific") && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Value
                          </label>
                          <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600">
                            {editingRule.value || "—"}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Value
                      </label>
                      <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600">
                        {editingRule.value || "—"}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={closeEditModal}
                      className="px-4 py-2 bg-[#d35400] text-white rounded-md hover:bg-[#e67e22] font-semibold"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            )}

            {(editModalType === "text" || editModalType === "layout") && editingField && (
              <>
                <div className="bg-[#d35400] text-white px-6 py-4 rounded-t-lg">
                  <h2 className="text-lg font-bold">
                    {editModalType === "text" ? "Add Text Value" : "Evaluate Content"}
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-gray-600 text-sm">
                    {editModalType === "text"
                      ? "Select the Text Field and then enter the value for that field"
                      : "Content to evaluate"}
                  </p>
                  
                  {editModalType === "text" && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Field
                      </label>
                      <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600">
                        Note
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {editModalType === "text" ? "Value" : "Name"}
                    </label>
                    <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600">
                      {editingField.value || "—"}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={closeEditModal}
                      className="px-4 py-2 bg-[#d35400] text-white rounded-md hover:bg-[#e67e22] font-semibold"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
