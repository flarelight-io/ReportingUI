import { Component, Prop, h, Event, EventEmitter } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';

interface SunburstNode {
  id: string | number;
  parentId: string | number | null;
  name: string;
  value: number;
  color?: string;
  label?: string;
  // For rendering
  path?: string;
  startAngle?: number;
  endAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  depth?: number;
}

interface HierarchyNode {
  id: string | number;
  parentId: string | number | null;
  name: string;
  value: number;
  children: HierarchyNode[];
  depth: number;
  originalValue: number;
}

@Component({
  tag: 'sunburst-chart-visualization',
  styleUrl: 'sunburst-chart-visualization.scss',
  shadow: true
})
export class SunburstChartVisualization {
  @Prop() config: DataWidgetConfig;
  @Prop() data: VisualizationData;
  
  @Event() filterChange: EventEmitter<FilterChangeEventDetail>;

  private handleFilterClick(fieldName: string, value: any) {
    if (this.config.sourceId && fieldName) {
      this.filterChange.emit({
        sourceId: this.config.sourceId,
        field: fieldName,
        value: value
      });
    }
  }

  private processData(): SunburstNode[] {
    const rawData = this.data.rawData || [];
    
    if (rawData.length === 0 || !this.config.idField || !this.config.parentIdField || !this.config.valueField) {
      return [];
    }

    const idField = this.config.idField;
    const parentIdField = this.config.parentIdField;
    const valueField = this.config.valueField;
    const labelField = this.config.labelField || this.config.groupByField;
    
    // Convert flat data to hierarchical nodes with proper parent/child relationships
    const nodeMap = new Map<string | number, SunburstNode>();
    
    // First pass: create all nodes
    rawData.forEach((item) => {
      const id = item[idField];
      if (id !== undefined) {
        nodeMap.set(id, {
          id,
          parentId: item[parentIdField],
          name: item[this.config.groupByField] || String(id),
          label: item[labelField] || item[this.config.groupByField] || String(id),
          value: Number(item[valueField] || 0)
        });
      }
    });
    
    // Process data into a hierarchical structure
    return this.calculateSunburstLayout(nodeMap);
  }

  private calculateSunburstLayout(nodeMap: Map<string | number, SunburstNode>): SunburstNode[] {
    // Build hierarchy
    const nodes = Array.from(nodeMap.values());
    const rootNodes: SunburstNode[] = [];
    const hierarchyNodes: HierarchyNode[] = [];
    
    // First, create hierarchy nodes
    nodes.forEach(node => {
      hierarchyNodes.push({
        id: node.id,
        parentId: node.parentId,
        name: node.name,
        value: node.value,
        originalValue: node.value,
        children: [],
        depth: 0
      });
    });
    
    // Build parent-child relationships
    const hierarchyMap = new Map<string | number, HierarchyNode>();
    hierarchyNodes.forEach(node => hierarchyMap.set(node.id, node));
    
    hierarchyNodes.forEach(node => {
      if (node.parentId === null || node.parentId === undefined || !hierarchyMap.has(node.parentId)) {
        // This is a root node
        rootNodes.push(nodeMap.get(node.id));
        node.depth = 0;
      } else {
        // Add this node as a child to its parent
        const parent = hierarchyMap.get(node.parentId);
        if (parent) {
          parent.children.push(node);
          node.depth = parent.depth + 1;
        }
      }
    });
    
    // Calculate sizes based on depth and angle
    const colors = this.getColors();
    const svgNodes: SunburstNode[] = [];
    
    // Handle equalSegments setting
    if (this.config.equalSegments) {
      // If equal segments, adjust values to be equal within each level
      this.equalizeNodeValues(hierarchyMap);
    }
    
    // Calculate total sum of root nodes to determine angles
    const totalRootValue = rootNodes.reduce((sum, node) => sum + nodeMap.get(node.id).value, 0);
    
    let colorIndex = 0;
    let startAngle = 0;
    
    // Calculate the maximum depth for radius scaling
    const maxDepth = Math.max(...Array.from(hierarchyMap.values()).map(n => n.depth)) + 1;
    const baseRadius = 40; // Maximum radius of the chart

    // Each level uses a portion of the baseRadius
    const radiusIncrement = baseRadius / maxDepth;
    
    // Process root nodes first
    rootNodes.forEach(rootNode => {
      const rootHierarchyNode = hierarchyMap.get(rootNode.id);
      if (rootHierarchyNode) {
        const rootValue = rootHierarchyNode.value;
        const angleSize = (rootValue / totalRootValue) * 360;
        const endAngle = startAngle + angleSize;
        
        // Add the root node with calculated angles
        const node = {
          ...rootNode,
          startAngle,
          endAngle,
          innerRadius: 0,
          outerRadius: radiusIncrement,
          depth: 0,
          color: colors[colorIndex % colors.length]
        };
        
        svgNodes.push(node);
        
        // Process children of the root node
        this.processChildren(
          rootHierarchyNode.children,
          hierarchyMap,
          svgNodes,
          startAngle,
          endAngle,
          radiusIncrement,
          1,
          colors,
          colorIndex,
          radiusIncrement
        );
        
        startAngle = endAngle;
        colorIndex++;
      }
    });
    
    return svgNodes;
  }
  
  private processChildren(
    children: HierarchyNode[],
    hierarchyMap: Map<string | number, HierarchyNode>,
    svgNodes: SunburstNode[],
    startAngle: number,
    endAngle: number,
    innerRadius: number,
    depth: number,
    colors: string[],
    baseColorIndex: number,
    radiusIncrement: number
  ) {
    if (children.length === 0) return;
    
    const totalValue = children.reduce((sum, child) => sum + child.value, 0);
    const outerRadius = innerRadius + radiusIncrement;
    
    let currentStartAngle = startAngle;
    children.forEach((child, index) => {
      const angleSize = totalValue > 0 ? (child.value / totalValue) * (endAngle - startAngle) : 0;
      const childEndAngle = currentStartAngle + angleSize;
      
      // Create the node for this child
      const node: SunburstNode = {
        id: child.id,
        parentId: child.parentId,
        name: child.name,
        value: child.originalValue,
        startAngle: currentStartAngle,
        endAngle: childEndAngle,
        innerRadius,
        outerRadius,
        depth,
        color: colors[(baseColorIndex + index) % colors.length]
      };
      
      svgNodes.push(node);
      
      // Process this child's children
      this.processChildren(
        child.children,
        hierarchyMap,
        svgNodes,
        currentStartAngle,
        childEndAngle,
        outerRadius,
        depth + 1,
        colors,
        baseColorIndex + index,
        radiusIncrement
      );
      
      currentStartAngle = childEndAngle;
    });
  }
  
  private equalizeNodeValues(hierarchyMap: Map<string | number, HierarchyNode>) {
    // Group nodes by depth
    const nodesByDepth = new Map<number, HierarchyNode[]>();
    
    hierarchyMap.forEach(node => {
      if (!nodesByDepth.has(node.depth)) {
        nodesByDepth.set(node.depth, []);
      }
      nodesByDepth.get(node.depth).push(node);
    });
    
    // Equalize values within each level
    nodesByDepth.forEach(nodes => {
      // Group by parent
      const nodesByParent = new Map<string | number, HierarchyNode[]>();
      
      nodes.forEach(node => {
        const parentId = node.parentId === null || node.parentId === undefined ? 'root' : node.parentId;
        if (!nodesByParent.has(parentId)) {
          nodesByParent.set(parentId, []);
        }
        nodesByParent.get(parentId).push(node);
      });
      
      // Equalize within each parent group
      nodesByParent.forEach(parentNodes => {
        const equalValue = 1; // Each child gets equal value
        
        parentNodes.forEach(node => {
          node.value = equalValue;
        });
        
        // If this node has a parent, update the parent's value
        if (parentNodes.length > 0) {
          const parent = hierarchyMap.get(parentNodes[0].parentId);
          if (parent) {
            parent.value = parent.children.reduce((sum, child) => sum + child.value, 0);
          }
        }
      });
    });
  }
  
  private polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    // Convert degrees to radians and adjust for SVG coordinate system (0 at top, clockwise)
    const angleInRadians = ((angleInDegrees - 90) % 360) * Math.PI / 180.0;
    
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  }
  
  private describeArc(x: number, y: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number): string {
    // Ensure angles are properly formatted
    startAngle = startAngle % 360;
    endAngle = endAngle % 360;
    
    if (startAngle === endAngle) {
      return ''; // No visible segment
    }
    
    // Convert angles to radians and adjust for SVG coordinate system
    const startOuterPoint = this.polarToCartesian(x, y, outerRadius, startAngle);
    const endOuterPoint = this.polarToCartesian(x, y, outerRadius, endAngle);
    const startInnerPoint = this.polarToCartesian(x, y, innerRadius, startAngle);
    const endInnerPoint = this.polarToCartesian(x, y, innerRadius, endAngle);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    
    // Create the SVG path for a donut segment
    return [
      // Move to the start of the outer arc
      'M', startOuterPoint.x, startOuterPoint.y,
      // Draw the outer arc
      'A', outerRadius, outerRadius, 0, largeArcFlag, 1, endOuterPoint.x, endOuterPoint.y,
      // Line to the inner arc
      'L', endInnerPoint.x, endInnerPoint.y,
      // Draw the inner arc in the opposite direction
      'A', innerRadius, innerRadius, 0, largeArcFlag, 0, startInnerPoint.x, startInnerPoint.y,
      // Close the path
      'Z'
    ].join(' ');
  }
  
  private getAngleCenter(startAngle: number, endAngle: number): number {
    return startAngle + (endAngle - startAngle) / 2;
  }
  
  private getColors(): string[] {
    return [
      '#4285F4', '#EA4335', '#FBBC05', '#34A853', '#FF6D01', 
      '#46BDC6', '#7BAAF7', '#F07B72', '#FCD04F', '#71C287',
      '#FFA550', '#76CFCF', '#ABD0FD', '#F7B1AB', '#FEE29C',
      '#ADC7C0'
    ];
  }

  render() {
    if (this.data.loading) {
      return <div class="loading-spinner">Loading...</div>;
    }
    
    if (this.data.error) {
      return <div class="error-message">{this.data.error}</div>;
    }
    
    if (!this.config.idField || !this.config.parentIdField || !this.config.valueField) {
      return <div class="error-message">Please configure ID field, Parent ID field and Value field</div>;
    }
    
    const nodes = this.processData();
    
    if (nodes.length === 0) {
      return <div class="empty-data">No data available</div>;
    }
    
    // Center the chart in the viewport
    const viewBoxSize = 100;
    const centerX = viewBoxSize / 2;
    const centerY = viewBoxSize / 2;
    
    const arcPaths = nodes.map((node, index) => {
      // Calculate the path for the arc
      const path = this.describeArc(
        centerX, 
        centerY, 
        node.innerRadius, 
        node.outerRadius, 
        node.startAngle, 
        node.endAngle
      );
      
      // Calculate position for potential label
      const labelAngle = this.getAngleCenter(node.startAngle, node.endAngle);
      const labelRadius = node.innerRadius + (node.outerRadius - node.innerRadius) / 2;
      const labelPos = this.polarToCartesian(centerX, centerY, labelRadius, labelAngle);
      
      const showLabel = 
        this.config.showLabels && 
        (node.endAngle - node.startAngle) > 15 && // Only show if segment is large enough
        (node.outerRadius - node.innerRadius) > 5; // Only show if segment is thick enough
      
      // Use label field if available, fall back to name
      const displayText = node.label || node.name;
      const tooltipContent = `${displayText}: ${node.value.toLocaleString()}`;
      
      return (
        <g key={index} class="segment-group">
          <path 
            d={path} 
            class="segment"
            style={{ fill: node.color }}
            onClick={() => this.handleFilterClick(this.config.groupByField, node.name)}
          >
            <title>{tooltipContent}</title>
          </path>
          
          {showLabel && (
            <text 
              x={labelPos.x} 
              y={labelPos.y} 
              text-anchor="middle" 
              dominant-baseline="middle"
              class="segment-label"
              style={{
                fontSize: `${Math.min(3, Math.max(1, (node.outerRadius - node.innerRadius) / 8))}px`,
                fill: '#fff',
                pointerEvents: 'none',
                textShadow: '0px 0px 3px rgba(0,0,0,0.5)'
              }}
            >
              {displayText.toString().substring(0, 6)}{displayText.toString().length > 6 ? '...' : ''}
            </text>
          )}
        </g>
      );
    });
    
    // Add a legend for the chart
    const legendItems = [];
    const uniqueNodes = new Map();
    
    nodes.forEach(node => {
      // Only add one entry per name to avoid duplicates
      if (!uniqueNodes.has(node.name)) {
        uniqueNodes.set(node.name, node);
        legendItems.push(node);
      }
    });
    
    // Sort legend by hierarchy depth for better readability
    legendItems.sort((a, b) => (a.depth || 0) - (b.depth || 0));
    
    // If there are too many legend items, limit to the most important ones
    const maxLegendItems = 10;
    const displayedLegendItems = legendItems.length > maxLegendItems 
      ? legendItems.slice(0, maxLegendItems) 
      : legendItems;
    
    const legend = this.config.showLegend ? (
      <div class="chart-legend">
        {displayedLegendItems.map((node, index) => (
          <div key={index} class="legend-item">
            <div class="legend-color-box" style={{ backgroundColor: node.color }}></div>
            <div class="legend-text">{node.label || node.name}: {node.value.toLocaleString()}</div>
          </div>
        ))}
        {legendItems.length > maxLegendItems && (
          <div class="legend-more">+ {legendItems.length - maxLegendItems} more items</div>
        )}
      </div>
    ) : null;
    
    return (
      <div class="sunburst-chart-container">
        <div class="chart-area">
          <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            {arcPaths}
          </svg>
        </div>
        {legend}
      </div>
    );
  }
} 