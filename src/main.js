import { organization } from './data/organization.js';
import { layoutOrganization } from './org/layout.js';
import { OrgChart } from './org/OrgChart.js';
import './style.css';

const app = document.querySelector('#app');
const nodes = layoutOrganization(organization);
const childrenById = new Map(nodes.map((node) => [node.id, []]));
for (const node of nodes) {
  if (node.parent) childrenById.get(node.parent).push(node);
}

app.innerHTML = `
  <header class="topbar">
    <div class="title-block">
      <p class="eyebrow">关于我们</p>
      <h1>${organization.title}</h1>
      <p class="summary">${organization.rings.length} 个层级 · ${nodes.length} 个组织单元，显示在圆圈层上</p>
    </div>
    <label class="search">
      <span>搜索</span>
      <input id="search" type="search" placeholder="搜索组织单元" autocomplete="off" />
    </label>
  </header>
  <div id="stage">
    <p id="background-note" class="background-note" hidden>未加载到背景图，圆圈层由 WebGL 按同一半径绘制。</p>
  </div>
  <aside id="detail" class="detail" aria-live="polite">
    <p class="detail-kicker">组织单元</p>
    <h2 id="detail-title">选择一个圆圈上的单元</h2>
    <p id="detail-body">点击圆圈层上的名称，查看该单元的职责、上级和下级。</p>
    <dl id="detail-meta" hidden></dl>
  </aside>
  <footer class="legend" id="legend"></footer>
  <table class="sr-only">
    <caption>公司组织架构数据</caption>
    <thead><tr><th>名称</th><th>层级</th><th>上级</th><th>职责</th></tr></thead>
    <tbody>
      ${nodes
        .map((node) => {
          const parent = nodes.find((item) => item.id === node.parent);
          return `<tr><td>${node.name}</td><td>${node.ringName}</td><td>${parent?.name ?? '—'}</td><td>${node.duty}</td></tr>`;
        })
        .join('')}
    </tbody>
  </table>
`;

const stage = document.querySelector('#stage');
const legend = document.querySelector('#legend');
const detailTitle = document.querySelector('#detail-title');
const detailBody = document.querySelector('#detail-body');
const detailMeta = document.querySelector('#detail-meta');
const search = document.querySelector('#search');
const backgroundNote = document.querySelector('#background-note');

legend.innerHTML = organization.rings
  .map((ring) => {
    const count = nodes.filter((node) => node.ring === ring.id).length;
    return `<button type="button" data-ring="${ring.id}"><span>${ring.name}</span><small>${count}</small></button>`;
  })
  .join('');

const chart = new OrgChart(stage, {
  nodes,
  onSelect: ({ node, ringId }) => {
    document.querySelectorAll('.legend button').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.ring === ringId || button.dataset.ring === node?.ring);
    });
    if (node) {
      renderNode(node);
      return;
    }
    if (ringId) {
      const ring = organization.rings.find((item) => item.id === ringId);
      const members = nodes.filter((item) => item.ring === ringId);
      detailTitle.textContent = ring.name;
      detailBody.textContent = '这一圈上的组织单元：';
      detailMeta.hidden = false;
      detailMeta.innerHTML = members.map((item) => `<dt>${item.name}</dt><dd>${item.duty}</dd>`).join('');
      return;
    }
    detailTitle.textContent = '选择一个圆圈上的单元';
    detailBody.textContent = '点击圆圈层上的名称，查看该单元的职责、上级和下级。';
    detailMeta.hidden = true;
    detailMeta.innerHTML = '';
  },
});

stage.addEventListener('org-background', (event) => {
  backgroundNote.hidden = event.detail.ok;
});

function renderNode(node) {
  const parent = nodes.find((item) => item.id === node.parent);
  const children = childrenById.get(node.id) ?? [];
  detailTitle.textContent = node.name;
  detailBody.textContent = node.duty;
  detailMeta.hidden = false;
  detailMeta.innerHTML = `
    <dt>层级</dt><dd>${node.ringName}</dd>
    <dt>上级</dt><dd>${parent ? `<button type="button" data-node="${parent.id}">${parent.name}</button>` : '—'}</dd>
    <dt>下级</dt><dd>${
      children.length
        ? children.map((child) => `<button type="button" data-node="${child.id}">${child.name}</button>`).join('')
        : '—'
    }</dd>
  `;
}

detailMeta.addEventListener('click', (event) => {
  const button = event.target.closest('[data-node]');
  if (!button) return;
  chart.select(button.dataset.node);
});

legend.addEventListener('click', (event) => {
  const button = event.target.closest('[data-ring]');
  if (!button) return;
  chart.setFocusedRing(button.dataset.ring);
});

search.addEventListener('input', () => {
  chart.setQuery(search.value);
  const matched = search.value.trim()
    ? nodes.filter((node) => `${node.name}${node.duty}${node.ringName}`.toLowerCase().includes(search.value.trim().toLowerCase()))
    : nodes;
  if (search.value.trim() && matched.length === 0) {
    detailTitle.textContent = '没有匹配的组织单元';
    detailBody.textContent = '换一个名称、职责或层级试试。';
    detailMeta.hidden = true;
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    search.value = '';
    chart.setQuery('');
    chart.select(null);
  }
});
