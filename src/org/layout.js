/**
 * 把组织树铺到同心圆上。
 * 同一上级的下级占连续圆心角，角宽按叶子数量分配，避免外圈标签挤在一起。
 * 返回坐标以图片中心为原点，半径 1 对应背景图半宽。
 */
export function layoutOrganization(org) {
  const ringById = new Map(org.rings.map((ring) => [ring.id, ring]));
  const nodes = org.nodes.map((node) => ({
    ...node,
    angle: 0,
    angleStart: 0,
    angleEnd: 0,
    radius: 0,
    x: 0,
    y: 0,
  }));

  const byId = new Map();
  for (const node of nodes) {
    if (byId.has(node.id)) {
      throw new Error(`重复的组织单元 id: ${node.id}`);
    }
    const ring = ringById.get(node.ring);
    if (!ring) {
      throw new Error(`组织单元 ${node.id} 的层级 ${node.ring} 不存在`);
    }
    node.radius = ring.radius;
    node.ringName = ring.name;
    byId.set(node.id, node);
  }

  const children = new Map(nodes.map((node) => [node.id, []]));
  const roots = [];
  for (const node of nodes) {
    if (!node.parent) {
      roots.push(node);
      continue;
    }
    const parent = byId.get(node.parent);
    if (!parent) {
      throw new Error(`组织单元 ${node.id} 的上级 ${node.parent} 不存在`);
    }
    if (node.radius <= parent.radius) {
      throw new Error(`组织单元 ${node.id} 必须位于比上级更外的圆圈层`);
    }
    children.get(parent.id).push(node);
  }

  if (roots.length === 0) {
    throw new Error('组织架构至少需要一个顶层单元');
  }

  const weightOf = new Map();
  const weight = (node) => {
    if (weightOf.has(node.id)) return weightOf.get(node.id);
    const kids = children.get(node.id);
    const value = kids.length === 0 ? 1 : kids.reduce((sum, kid) => sum + weight(kid), 0);
    weightOf.set(node.id, value);
    return value;
  };

  const assign = (node, start, end) => {
    node.angleStart = start;
    node.angleEnd = end;
    node.angle = (start + end) / 2;
    const kids = children.get(node.id);
    const total = kids.reduce((sum, kid) => sum + weight(kid), 0) || 1;
    let edge = end;
    for (const kid of kids) {
      const span = ((end - start) * weight(kid)) / total;
      assign(kid, edge - span, edge);
      edge -= span;
    }
  };

  const full = Math.PI * 2;
  const totalRoot = roots.reduce((sum, node) => sum + weight(node), 0) || 1;
  let edge = Math.PI / 2;
  for (const root of roots) {
    const span = (full * weight(root)) / totalRoot;
    assign(root, edge - span, edge);
    edge -= span;
  }

  const anchor = nodes.find((node) => node.radius > 0);
  const shift = anchor ? Math.PI / 2 - anchor.angle : 0;
  for (const node of nodes) {
    node.angle += shift;
    node.angleStart += shift;
    node.angleEnd += shift;
    node.x = Math.cos(node.angle) * node.radius;
    node.y = Math.sin(node.angle) * node.radius;
  }

  return nodes;
}
