const grid = document.querySelector('#container-grid');
const cardNodes = new Map();
const feed = document.querySelector('#activity-feed');
let eventKeys = '';

function setText(selector, value) {
  document.querySelector(selector).textContent = value;
}

function relativeTime(iso) {
  if (!iso) return 'ainda sem log novo';
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (seconds < 2) return 'agora';
  if (seconds < 60) return `há ${seconds}s`;
  return `há ${Math.floor(seconds / 60)} min`;
}

function makeCard() {
  const card = document.createElement('article');
  card.className = 'container-card';
  const lamp = document.createElement('span');
  lamp.className = 'lamp';
  lamp.setAttribute('aria-hidden', 'true');
  const info = document.createElement('div');
  info.className = 'container-info';
  const name = document.createElement('code');
  name.className = 'container-name';
  const type = document.createElement('span');
  type.className = 'container-type';
  const details = document.createElement('div');
  details.className = 'container-state';
  const state = document.createElement('span');
  state.className = 'state-badge';
  const image = document.createElement('span');
  image.className = 'image-name';
  const activity = document.createElement('span');
  activity.className = 'logs-total';
  info.append(name, type);
  details.append(state, image, activity);
  card.append(lamp, info, details);
  return { card, lamp, name, type, state, image, activity };
}

function renderContainers(containers) {
  const current = new Set();
  for (const item of containers) {
    current.add(item.id);
    let node = cardNodes.get(item.id);
    if (!node) {
      node = makeCard();
      cardNodes.set(item.id, node);
      grid.append(node.card);
    }
    const running = item.state === 'running';
    node.name.textContent = item.name;
    node.name.title = item.name;
    node.type.textContent = item.type;
    node.type.title = item.type;
    node.state.textContent = running ? 'RODANDO' : item.status.toLocaleUpperCase('pt-BR');
    node.state.className = `state-badge ${running ? 'running' : 'stopped'}`;
    node.state.title = item.status;
    node.image.textContent = item.image;
    node.image.title = item.image;
    node.activity.textContent = `${item.logsSinceStart} logs · ${relativeTime(item.lastLogAt)}`;
    node.lamp.classList.toggle('is-active', item.lampOn);
    node.lamp.classList.toggle('is-offline', !running);
    node.lamp.setAttribute('aria-label', item.lampOn ? 'Log recente detectado' : 'Sem log recente');
    node.card.classList.toggle('is-running', running);
    node.card.classList.toggle('is-stopped', !running);
    node.card.classList.toggle('is-active', item.lampOn);
  }
  for (const [id, node] of cardNodes) {
    if (!current.has(id)) {
      node.card.remove();
      cardNodes.delete(id);
    }
  }
  document.querySelector('#container-grid').setAttribute('aria-busy', 'false');
  document.querySelector('#empty-state').hidden = containers.length !== 0;
}

function renderEvents(events) {
  const nextKeys = events.map((event) => event.id).join('|');
  if (nextKeys === eventKeys) return;
  eventKeys = nextKeys;
  feed.replaceChildren();
  if (events.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'feed-empty';
    empty.textContent = 'Aguardando novas linhas de log…';
    feed.append(empty);
    return;
  }
  for (const event of events) {
    const item = document.createElement('li');
    const content = document.createElement('div');
    const name = document.createElement('code');
    name.className = 'feed-name';
    name.textContent = event.container;
    const detail = document.createElement('span');
    detail.className = 'feed-detail';
    detail.textContent = `${event.type} · gerou uma linha de log`;
    const time = document.createElement('time');
    time.className = 'feed-time';
    time.dateTime = event.occurredAt;
    time.textContent = relativeTime(event.occurredAt);
    content.append(name, detail, time);
    item.append(content);
    feed.append(item);
  }
}

function render(snapshot) {
  setText('#project-label', snapshot.project);
  setText('#running-count', snapshot.runningContainers);
  setText('#active-count', snapshot.activeLamps);
  setText('#log-count', snapshot.totalLogLines.toLocaleString('pt-BR'));
  setText('#activity-count', snapshot.events.length);
  setText('#updated-at', new Date(snapshot.updatedAt).toLocaleTimeString('pt-BR'));

  const connection = document.querySelector('#connection-dot');
  const label = document.querySelector('#connection-label');
  connection.classList.toggle('connected', snapshot.connected);
  connection.classList.toggle('offline', !snapshot.connected);
  label.textContent = snapshot.connected ? 'Docker conectado' : 'Docker indisponível';

  const message = document.querySelector('#docker-message');
  message.hidden = snapshot.connected;
  message.textContent = 'Não foi possível consultar o Docker. Confira se o Docker Desktop está iniciado e se o projeto Compose está ativo.';

  const active = snapshot.activeLamps > 0;
  document.querySelector('#master-led').classList.toggle('active', active);
  setText('#master-state', active ? 'ATIVIDADE DETECTADA' : 'AGUARDANDO SINAL');
  renderContainers(snapshot.containers);
  renderEvents(snapshot.events);
}

let refreshPending = false;

async function refreshSnapshot() {
  if (refreshPending) return;
  refreshPending = true;
  try {
    const response = await fetch('/api/snapshot', { cache: 'no-store' });
    if (!response.ok) throw new Error('snapshot_unavailable');
    render(await response.json());
  } catch {
    document.querySelector('#connection-dot').classList.remove('connected');
    document.querySelector('#connection-dot').classList.add('offline');
    setText('#connection-label', 'Reconectando ao painel');
  } finally {
    refreshPending = false;
    window.setTimeout(refreshSnapshot, 1000);
  }
}

refreshSnapshot();
