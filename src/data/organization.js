/**
 * 公司组织架构。
 *
 * rings[].radius 是相对 public/about/architecture.png 半宽的半径：
 * 0 为圆心，1 为图片边缘。WebGL 场景按同一比例把节点放在对应圆圈层上。
 * 更换背景图后，调整这里的 radius，使数据重新落在图中的圆环上。
 */
export const architectureImage = '/about/architecture.png';

export const rings = [
  { id: 'core', name: '决策层', radius: 0 },
  { id: 'exec', name: '经营层', radius: 0.22 },
  { id: 'center', name: '中心层', radius: 0.48 },
  { id: 'dept', name: '部门层', radius: 0.74 },
];

export const nodes = [
  { id: 'board', name: '董事会', ring: 'core', duty: '决定经营方针、投资计划与重大治理事项' },

  { id: 'chairman', name: '董事长', ring: 'exec', parent: 'board', duty: '召集并主持董事会，把握公司战略方向' },
  { id: 'gm', name: '总经理', ring: 'exec', parent: 'board', duty: '主持日常经营，组织实施董事会决议' },
  { id: 'board-office', name: '董事会办公室', ring: 'exec', parent: 'board', duty: '治理事务、会议组织与信息披露协调' },
  { id: 'supervisor', name: '监事会', ring: 'exec', parent: 'board', duty: '监督董事与高级管理人员履职及公司财务' },

  { id: 'strategy', name: '战略投资中心', ring: 'center', parent: 'chairman', duty: '战略规划、投资并购与对外合作' },
  { id: 'rd', name: '研发中心', ring: 'center', parent: 'gm', duty: '产品技术研发、架构演进与工程效能' },
  { id: 'product', name: '产品中心', ring: 'center', parent: 'gm', duty: '产品规划、体验设计与需求管理' },
  { id: 'marketing', name: '营销中心', ring: 'center', parent: 'gm', duty: '品牌、市场与销售增长' },
  { id: 'delivery', name: '交付中心', ring: 'center', parent: 'gm', duty: '项目实施、客户成功与服务保障' },
  { id: 'hr', name: '人力资源中心', ring: 'center', parent: 'board-office', duty: '组织发展、人才发展与文化机制' },
  { id: 'finance', name: '财务管理中心', ring: 'center', parent: 'board-office', duty: '核算、资金、预算与经营分析' },
  { id: 'compliance', name: '合规审计中心', ring: 'center', parent: 'supervisor', duty: '法务合规、内部审计与风险控制' },

  { id: 'invest', name: '投资发展部', ring: 'dept', parent: 'strategy', duty: '项目筛选、尽调与投后管理' },
  { id: 'pr', name: '公共关系部', ring: 'dept', parent: 'strategy', duty: '媒体沟通、政府关系与品牌声誉' },
  { id: 'platform', name: '平台研发部', ring: 'dept', parent: 'rd', duty: '平台架构、基础能力与技术中台' },
  { id: 'app', name: '应用研发部', ring: 'dept', parent: 'rd', duty: '业务系统研发与交付支持' },
  { id: 'qa', name: '质量保障部', ring: 'dept', parent: 'rd', duty: '测试体系、质量度量与发布保障' },
  { id: 'planning', name: '产品规划部', ring: 'dept', parent: 'product', duty: '路线图、版本规划与需求优先级' },
  { id: 'design', name: '体验设计部', ring: 'dept', parent: 'product', duty: '交互、视觉与设计规范' },
  { id: 'brand', name: '品牌市场部', ring: 'dept', parent: 'marketing', duty: '品牌传播、市场活动与线索运营' },
  { id: 'sales', name: '销售部', ring: 'dept', parent: 'marketing', duty: '客户拓展、方案销售与合同推进' },
  { id: 'implement', name: '项目实施部', ring: 'dept', parent: 'delivery', duty: '项目交付、实施管理与验收' },
  { id: 'success', name: '客户成功部', ring: 'dept', parent: 'delivery', duty: '客户运营、续约与价值实现' },
  { id: 'orgdev', name: '组织发展部', ring: 'dept', parent: 'hr', duty: '组织设计、编制与干部机制' },
  { id: 'talent', name: '人才发展部', ring: 'dept', parent: 'hr', duty: '招聘、培训与绩效发展' },
  { id: 'accounting', name: '财务核算部', ring: 'dept', parent: 'finance', duty: '核算报告、税务与成本管理' },
  { id: 'treasury', name: '资金管理部', ring: 'dept', parent: 'finance', duty: '资金计划、收付与融资协同' },
  { id: 'legal', name: '法务合规部', ring: 'dept', parent: 'compliance', duty: '合同审查、合规制度与争议处理' },
  { id: 'audit', name: '内部审计部', ring: 'dept', parent: 'compliance', duty: '内部审计、内控评价与整改跟踪' },
];

export const organization = {
  title: '组织架构',
  rings,
  nodes,
};
