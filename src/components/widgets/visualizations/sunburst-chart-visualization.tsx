import { Component, Prop, h, Event, EventEmitter, State, Watch, Element } from '@stencil/core';
import { FilterChangeEventDetail, VisualizationData } from './base-visualization';
import { DataWidgetConfig } from '../data-widget';
import { ChartThemeUtils, ChartAnimations, ColorTheme } from '../../../utils/chart-theme';
import { placeTooltip } from '../../../utils/tooltip';

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

interface TooltipState {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

@Component({
  tag: 'sunburst-chart-visualization',
  styleUrl: 'sunburst-chart-visualization.scss',
  shadow: true
})
export class SunburstChartVisualization {
  @Prop() config: DataWidgetConfig;
  @Prop() data: VisualizationData;
  @Prop() colorTheme: ColorTheme = "brand";
  
  @State() tooltip: TooltipState = { visible: false, text: '', x: 0, y: 0 };
  @State() themeVersion: number = 0; // Force re-render when theme changes
  @State() legendFontSize: number = 10;

  @Element() el: HTMLElement;

  @Event() filterChange: EventEmitter<FilterChangeEventDetail>;

  private adjustingFont: boolean = false;

  componentDidRender() {
    if (this.adjustingFont) return;
    requestAnimationFrame(() => {
      const legend = this.el.shadowRoot?.querySelector('.chart-legend') as HTMLElement;
      if (!legend) return;
      if (legend.scrollHeight > legend.clientHeight && this.legendFontSize > 6) {
        this.adjustingFont = true;
        this.legendFontSize = Math.max(6, this.legendFontSize - 1);
        this.adjustingFont = false;
      }
    });
  }

  @Watch('data')
  onDataChange() {
    this.legendFontSize = 10;
  }

  componentWillLoad() {
    // Listen for theme changes
    ChartThemeUtils.onThemeChange(() => {
      this.themeVersion++;
    });
  }

  private handleFilterClick(fieldName: string, value: any) {
    if (this.config.sourceId && fieldName) {
      this.filterChange.emit({
        sourceId: this.config.sourceId,
        field: fieldName,
        value: value
      });
    }
  }

  private handleMouseMove(event: MouseEvent, name: string, value: number) {
    const svgRect = (event.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
    if (svgRect) {
      // Format tooltip text with proper line breaks for long categories
      const formattedValue = ChartThemeUtils.formatNumber(value);
      const maxCategoryLength = 30;
      const truncatedName = name.length > maxCategoryLength 
        ? `${name.substring(0, maxCategoryLength)}...` 
        : name;
      
      this.tooltip = {
        visible: true,
        text: `${truncatedName}\n${formattedValue}`,
        x: event.clientX,
        y: event.clientY
      };
    }
  }

  private handleMouseLeave() {
    this.tooltip = { ...this.tooltip, visible: false };
  }

  private processData(): SunburstNode[] {
    const rawData = this.data.rawData || [];
    
    const idField = 'idField' in this.config ? this.config.idField : undefined;
    const parentIdField = 'parentIdField' in this.config ? this.config.parentIdField : undefined;
    const valueField = 'valueField' in this.config ? this.config.valueField : undefined;
    const labelField = 'labelField' in this.config ? this.config.labelField : undefined;
    const groupByField = 'groupByField' in this.config ? this.config.groupByField : undefined;
    
    if (rawData.length === 0 || !idField || !parentIdField || !valueField) {
      return [];
    }

    const idFieldName = idField;
    const parentIdFieldName = parentIdField;
    const valueFieldName = valueField;
    const labelFieldName = labelField || groupByField;
    
    // Convert flat data to hierarchical nodes with proper parent/child relationships
    const nodeMap = new Map<string | number, SunburstNode>();
    
    // First pass: create all nodes
    rawData.forEach((item) => {
      const id = item[idFieldName];
      if (id !== undefined) {
        nodeMap.set(id, {
          id,
          parentId: item[parentIdFieldName],
          name: item[groupByField || ''] || String(id),
          label: item[labelFieldName || ''] || item[groupByField || ''] || String(id),
          value: Number(item[valueFieldName] || 0)
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
    const equalSegments = 'equalSegments' in this.config ? this.config.equalSegments : undefined;
    if (equalSegments) {
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
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    return theme.series;
  }

  render() {
    if (this.data.loading) {
      return <div class="loading-spinner">Loading...</div>;
    }
    
    if (this.data.error) {
      return <div class="error-message">{this.data.error}</div>;
    }
    
    // Extract config properties for use in render
    const idField = 'idField' in this.config ? this.config.idField : undefined;
    const parentIdField = 'parentIdField' in this.config ? this.config.parentIdField : undefined;
    const valueField = 'valueField' in this.config ? this.config.valueField : undefined;
    const groupByField = 'groupByField' in this.config ? this.config.groupByField : undefined;
    
    if (!idField || !parentIdField || !valueField) {
      return <div class="error-message">Please configure ID field, Parent ID field and Value field</div>;
    }
    
    const nodes = this.processData();
    const theme = ChartThemeUtils.getTheme(this.colorTheme);
    
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
      const tooltipContent = `${displayText}: ${ChartThemeUtils.formatNumber(node.value)}`;
      
      return (
        <g key={index} class="segment-group">
          <path 
            d={path} 
            class="segment segment-animated segment-glow"
            style={{ 
              fill: `url(#sunburstGradient-${index})`,
              cursor: 'pointer',
              transition: ChartAnimations.getHoverTransition(),
              animationDelay: `${ChartAnimations.getStaggerDelay(index)}ms`,
              animationFillMode: 'both'
            }}
            onClick={() => this.handleFilterClick(groupByField || '', node.name)}
            onMouseMove={(event) => this.handleMouseMove(event, node.name, node.value)}
            onMouseLeave={() => this.handleMouseLeave()}
            filter="url(#softShadow)"
          >
            <title>{tooltipContent}</title>
          </path>
          
          {showLabel && (
            <text 
              x={labelPos.x} 
              y={labelPos.y} 
              text-anchor="middle" 
              dominant-baseline="middle"
              class="segment-label text-animated"
              style={{
                fontSize: `${Math.min(3, Math.max(1, (node.outerRadius - node.innerRadius) / 8))}px`,
                fill: theme.labelColor,
                fontFamily: theme.fontFamily,
                fontWeight: '500',
                pointerEvents: 'none',
                paintOrder: 'stroke fill',
                stroke: 'rgba(0,0,0,0.1)',
                strokeWidth: '0.5',
                animationDelay: `${ChartAnimations.getStaggerDelay(index) + 100}ms`,
                animationFillMode: 'both'
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
    
    const legend = (this.config.showLegend !== false) ? (
      <div class="chart-legend" part="legend">
        {displayedLegendItems.map((node, index) => (
          <div key={index} class="legend-item">
            <div class="color-indicator" style={{ backgroundColor: node.color }}></div>
            <span class="legend-text" style={{ fontSize: `${this.legendFontSize}px` }}>{node.label || node.name}: {ChartThemeUtils.formatNumber(node.value)}</span>
          </div>
        ))}
        {legendItems.length > maxLegendItems && (
          <div class="legend-more">+ {legendItems.length - maxLegendItems} more items</div>
        )}
      </div>
    ) : null;
    
    return (
      <div class="sunburst-chart-container" part="chart">
        <div class="chart-area">
          <svg 
            viewBox="0 0 100 100" 
            preserveAspectRatio="xMidYMid meet"
            {...ChartThemeUtils.getSVGAttributes()}
          >
            {/* Define gradients and filters for modern styling */}
            <defs>
              {nodes.map((node, index) => (
                <linearGradient key={`sunburstGradient-${index}`} id={`sunburstGradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color={node.color} stop-opacity="1"/>
                  <stop offset="100%" stop-color={node.color} stop-opacity="0.85"/>
                </linearGradient>
              ))}
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx={theme.shadow.dx} dy={theme.shadow.dy} stdDeviation={theme.shadow.blur} flood-opacity={theme.shadow.opacity}/>
              </filter>
            </defs>
            {arcPaths}
          </svg>
          
          {/* Tooltip with modern styling */}
          {this.tooltip.visible && (
            <div 
              part="tooltip" class={`chart-tooltip ${this.tooltip.visible ? 'visible' : ''}`}
              ref={(el) => placeTooltip(el, this.tooltip.x, this.tooltip.y)}
            >
              <div style={{ whiteSpace: 'pre-line', textAlign: 'center' }}>
                {this.tooltip.text}
              </div>
            </div>
          )}
        </div>
        {legend}
      </div>
    );
  }
} 