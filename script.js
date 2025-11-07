let canais = [
    { id: 1, nome: 'Canal de Games', status: 'Ativo', avatar: 'https://i.pravatar.cc/40?u=games' },
    { id: 2, nome: 'Receitas da Vovó', status: 'Ativo', avatar: 'https://i.pravatar.cc/40?u=receitas' },
];
let biblioteca = [
    { id: 1001, titulo: 'Gameplay Épica #1', thumb: 'https://via.placeholder.com/150/4f46e5/ffffff?text=Game1', status: 'Disponível' },
    { id: 1002, titulo: 'Review de Jogo Indie', thumb: 'https://via.placeholder.com/150/4f46e5/ffffff?text=Game2', status: 'Disponível' },
    { id: 1003, titulo: 'Torta de Limão Fácil', thumb: 'https://via.placeholder.com/150/16a34a/ffffff?text=Food1', status: 'Disponível' },
];
let posts = [
    { id: 1, canalId: 1, bibliotecaId: 1001, titulo: 'Gameplay Épica #1', status: 'Agendado', data: '2025-11-10T18:00:00' },
    { id: 2, canalId: 2, bibliotecaId: 1003, titulo: 'Torta de Limão Fácil', status: 'Publicado', data: '2025-11-06T12:00:00' },
    { id: 3, canalId: 1, bibliotecaId: null, titulo: 'Vídeo Antigo com Erro', status: 'Erro', data: '2025-11-05T10:00:00' },
];
let canalAtivoId = null;
let videoSelecionadoId = null;

function navigateTo(pageId, id = null ) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    if (pageId === 'detalhes-canal' && id) {
        canalAtivoId = id;
        renderizarDetalhesCanal(id);
    } else {
        document.querySelector(`.nav-link[href="#${pageId}"]`).classList.add('active');
    }
    document.getElementById(pageId).classList.add('active');
    feather.replace();
}

function renderizarDashboard() {
    const erros = posts.filter(p => p.status === 'Erro').length;
    document.getElementById('stat-erros').innerText = erros;
}

function renderizarTabelaCanais() {
    const tbody = document.querySelector('#tabela-canais tbody');
    tbody.innerHTML = '';
    canais.forEach(c => {
        tbody.innerHTML += `
            <tr>
                <td><div style="display:flex; align-items:center; gap:12px;"><img src="${c.avatar}" style="width:40px; height:40px; border-radius:50%;"><span style="font-weight:600;">${c.nome}</span></div></td>
                <td><span class="status status-${c.status.toLowerCase()}">${c.status}</span></td>
                <td><button class="btn btn-secondary" onclick="navigateTo('detalhes-canal', ${c.id})"><i data-feather="arrow-right"></i>Detalhes</button></td>
            </tr>`;
    });
}

function renderizarDetalhesCanal(canalId) {
    const canal = canais.find(c => c.id === canalId);
    document.getElementById('nome-canal-detalhes').innerText = canal.nome;
    const tbody = document.querySelector('#tabela-backlog tbody');
    tbody.innerHTML = '';
    posts.filter(p => p.canalId === canalId).forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td>${p.titulo}</td>
                <td><span class="status status-${p.status.toLowerCase()}">${p.status}</span></td>
                <td>${new Date(p.data).toLocaleString('pt-BR')}</td>
                <td><button class="btn btn-secondary btn-sm"><i data-feather="edit-2"></i></button></td>
            </tr>`;
    });
}

function renderizarBiblioteca() {
    const grid = document.getElementById('grid-biblioteca');
    grid.innerHTML = '';
    biblioteca.forEach(v => {
        grid.innerHTML += `
            <div class="card" style="padding: 0; overflow: hidden;">
                <img src="${v.thumb}" style="width:100%; height: 100px; object-fit: cover;">
                <div style="padding: 12px;">
                    <p style="font-weight: 600; margin: 0 0 8px 0;">${v.titulo}</p>
                    <span class="status status-${v.status.toLowerCase()}">${v.status}</span>
                </div>
            </div>`;
    });
}

function openModal(modalId) {
    if (modalId === 'modal-falhas') renderizarModalFalhas();
    if (modalId === 'modal-selecionar-video') renderizarSelecaoVideo();
    document.getElementById(modalId).style.display = 'flex';
    feather.replace();
}
function closeModal(modalId) { document.getElementById(modalId).style.display = 'none'; }

function renderizarModalFalhas() {
    const tbody = document.querySelector('#tabela-falhas tbody');
    tbody.innerHTML = '';
    posts.filter(p => p.status === 'Erro').forEach(p => {
        const canal = canais.find(c => c.id === p.canalId);
        tbody.innerHTML += `
            <tr>
                <td>${canal.nome}</td>
                <td>${p.titulo}</td>
                <td>
                    <button class="btn btn-secondary"><i data-feather="refresh-cw"></i> Tentar de Novo</button>
                    <button class="btn btn-danger"><i data-feather="trash-2"></i></button>
                </td>
            </tr>`;
    });
}

function renderizarSelecaoVideo() {
    const grid = document.getElementById('grid-selecao-video');
    grid.innerHTML = '';
    biblioteca.filter(v => v.status === 'Disponível').forEach(v => {
        grid.innerHTML += `
            <div class="media-item" id="media-item-${v.id}" onclick="selecionarVideo(${v.id})">
                <img src="${v.thumb}" alt="${v.titulo}">
                <div class="title">${v.titulo}</div>
            </div>`;
    });
}

function selecionarVideo(id) {
    document.querySelectorAll('.media-item').forEach(item => item.classList.remove('selected'));
    document.getElementById(`media-item-${id}`).classList.add('selected');
    videoSelecionadoId = id;
}

function abrirFormularioAgendamento() {
    if (!videoSelecionadoId) {
        alert('Por favor, selecione um vídeo primeiro.');
        return;
    }
    const video = biblioteca.find(v => v.id === videoSelecionadoId);
    document.getElementById('video-selecionado-nome').innerText = video.titulo;
    document.getElementById('titulo-video').value = video.titulo;
    closeModal('modal-selecionar-video');
    openModal('modal-agendar-video');
}

function agendarVideo(event) {
    event.preventDefault();
    const novoPost = {
        id: Date.now(),
        canalId: canalAtivoId,
        bibliotecaId: videoSelecionadoId,
        titulo: document.getElementById('titulo-video').value,
        status: 'Agendado',
        data: document.getElementById('data-agendamento').value
    };
    posts.push(novoPost);
    
    const videoDaBiblioteca = biblioteca.find(v => v.id === videoSelecionadoId);
    videoDaBiblioteca.status = 'Agendado';

    alert('Vídeo agendado com sucesso!');
    closeModal('modal-agendar-video');
    renderizarDetalhesCanal(canalAtivoId);
    renderizarBiblioteca();
    videoSelecionadoId = null;
}

window.onload = () => {
    navigateTo('dashboard');
    renderizarDashboard();
    renderizarTabelaCanais();
    renderizarBiblioteca();
    feather.replace();
};
