// --- Dados Simulados Iniciais ---
let dadosSimulados = {
    canais: [
        { id: 1, nome: "Canal Principal", youtubeId: "UC_x5XG1OV2P6uZZ5FSM9Ttw", horario: "09:00", status: "Ativo" },
        { id: 2, nome: "Canal de Cortes", youtubeId: "UC_anotherone", horario: "12:00", status: "Ativo" },
        { id: 3, nome: "Canal de Testes", youtubeId: "UC_andanother", horario: "15:00", status: "Inativo" },
    ],
    biblioteca: [
        { id: 1, nome: "video_final_01.mp4", duracao: "10:25", status: "Na Biblioteca" },
        { id: 2, nome: "tutorial_novo_feature.mp4", duracao: "05:12", status: "Agendado" },
        { id: 3, nome: "video_antigo_01.mp4", duracao: "15:40", status: "Postado" },
    ],
    agendamentosHoje: 1,
    falhas: 0,
};

// --- Funções de Renderização ---

function renderizarTabelaCanais() {
    const tbody = document.querySelector("#canais-table-dashboard tbody");
    if (!tbody) return;
    tbody.innerHTML = '';

    dadosSimulados.canais.forEach(canal => {
        const statusClass = canal.status === 'Ativo' ? 'status-ativo' : 'status-inativo';
        const tr = `
            <tr>
                <td>${canal.nome}</td>
                <td>Hoje às ${canal.horario}</td>
                <td><span class="status-badge ${statusClass}">${canal.status}</span></td>
                <td>
                    <button class="btn-icon edit-icon" title="Editar" onclick="openChannelModalForEdit(${canal.id})"><i data-feather="edit-2"></i></button>
                    <button class="btn-icon remove-icon" title="Remover" onclick="removerCanal(${canal.id})"><i data-feather="trash-2"></i></button>
                </td>
            </tr>
        `;
        tbody.innerHTML += tr;
    });
    feather.replace();
}

function renderizarTabelaBiblioteca() {
    const tbody = document.querySelector("#library-table tbody");
    if (!tbody) return;
    tbody.innerHTML = '';

    dadosSimulados.biblioteca.forEach(video => {
        let statusClass = '';
        switch (video.status) {
            case 'Na Biblioteca': statusClass = 'status-biblioteca'; break;
            case 'Agendado': statusClass = 'status-agendado'; break;
            case 'Postado': statusClass = 'status-postado'; break;
        }
        
        const tr = `
            <tr>
                <td>${video.nome}</td>
                <td>${video.duracao}</td>
                <td><span class="status-badge ${statusClass}">${video.status}</span></td>
                <td>
                    <button class="btn-icon schedule-icon" title="Agendar" onclick="openScheduleModal(${video.id})"><i data-feather="calendar"></i></button>
                    <button class="btn-icon metadata-icon" title="Editar Metadados"><i data-feather="align-left"></i></button>
                    <button class="btn-icon remove-icon" title="Remover" onclick="removerVideo(${video.id})"><i data-feather="trash-2"></i></button>
                </td>
            </tr>
        `;
        tbody.innerHTML += tr;
    });
    feather.replace();
}

function renderizarDashboard() {
    document.getElementById('stat-canais-ativos').textContent = dadosSimulados.canais.filter(c => c.status === 'Ativo').length;
    document.getElementById('stat-videos-biblioteca').textContent = dadosSimulados.biblioteca.length;
    document.getElementById('stat-agendados-hoje').textContent = dadosSimulados.agendamentosHoje;
    document.getElementById('stat-falhas-upload').textContent = dadosSimulados.falhas;
    renderizarTabelaCanais();
}

// --- Navegação ---

function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector(`.nav-link[onclick="navigateTo('${pageId}')"]`).classList.add('active');

    if (pageId === 'library') {
        renderizarTabelaBiblioteca();
    }
}

// --- Funções CRUD para Canais ---

function removerCanal(id) {
    if (confirm("Tem certeza que deseja remover este canal?")) {
        dadosSimulados.canais = dadosSimulados.canais.filter(canal => canal.id !== id);
        renderizarDashboard();
    }
}

// --- Funções da Biblioteca ---

function simularUpload() {
    const novoId = dadosSimulados.biblioteca.length > 0 ? Math.max(...dadosSimulados.biblioteca.map(v => v.id)) + 1 : 1;
    const novoVideo = {
        id: novoId,
        nome: `novo_video_${String(novoId).padStart(2, '0')}.mp4`,
        duracao: `${Math.floor(Math.random() * 10 + 5)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
        status: "Na Biblioteca"
    };
    dadosSimulados.biblioteca.push(novoVideo);
    renderizarTabelaBiblioteca();
    renderizarDashboard();
    alert(`Simulação: "${novoVideo.nome}" foi adicionado à biblioteca!`);
}

function removerVideo(id) {
    if (confirm("Tem certeza que deseja remover este vídeo da biblioteca?")) {
        dadosSimulados.biblioteca = dadosSimulados.biblioteca.filter(video => video.id !== id);
        renderizarTabelaBiblioteca();
        renderizarDashboard();
    }
}

// --- Funções dos Modais (Pop-ups) ---

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Modal de Canais
const channelModal = document.getElementById('channel-modal');
const channelForm = document.getElementById('channel-form');
const channelModalTitle = document.getElementById('channel-modal-title');
const channelEditId = document.getElementById('channel-edit-id');

function openChannelModalForNew() {
    channelForm.reset();
    channelModalTitle.textContent = "Adicionar Novo Canal";
    channelEditId.value = "";
    channelModal.classList.remove('hidden');
}

function openChannelModalForEdit(id) {
    const canalParaEditar = dadosSimulados.canais.find(canal => canal.id === id);
    if (canalParaEditar) {
        channelModalTitle.textContent = "Editar Canal";
        channelEditId.value = id;
        document.getElementById('channel-name').value = canalParaEditar.nome;
        document.getElementById('channel-id').value = canalParaEditar.youtubeId;
        channelModal.classList.remove('hidden');
    }
}

channelForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const nome = document.getElementById('channel-name').value;
    const youtubeId = document.getElementById('channel-id').value;
    const idParaEditar = parseInt(channelEditId.value);

    if (idParaEditar) {
        const index = dadosSimulados.canais.findIndex(c => c.id === idParaEditar);
        if (index !== -1) {
            dadosSimulados.canais[index].nome = nome;
            dadosSimulados.canais[index].youtubeId = youtubeId;
        }
    } else {
        const novoId = dadosSimulados.canais.length > 0 ? Math.max(...dadosSimulados.canais.map(c => c.id)) + 1 : 1;
        const newChannel = { id: novoId, nome, youtubeId, horario: "N/A", status: "Ativo" };
        dadosSimulados.canais.push(newChannel);
    }
    renderizarDashboard();
    closeModal('channel-modal');
});

// Modal de Agendamento
const scheduleModal = document.getElementById('schedule-modal');
const scheduleForm = document.getElementById('schedule-form');

function openScheduleModal(videoId) {
    const video = dadosSimulados.biblioteca.find(v => v.id === videoId);
    if (!video) return;

    document.getElementById('schedule-video-name').textContent = video.nome;
    document.getElementById('schedule-video-id').value = video.id;

    const channelSelect = document.getElementById('schedule-channel');
    channelSelect.innerHTML = '<option value="">Selecione um canal...</option>';
    dadosSimulados.canais
        .filter(c => c.status === 'Ativo')
        .forEach(canal => {
            const option = `<option value="${canal.id}">${canal.nome}</option>`;
            channelSelect.innerHTML += option;
        });
    
    scheduleModal.classList.remove('hidden');
}

scheduleForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const videoId = parseInt(document.getElementById('schedule-video-id').value);
    const channelId = document.getElementById('schedule-channel').value;
    const datetime = document.getElementById('schedule-datetime').value;

    if (!channelId || !datetime) {
        alert("Por favor, selecione um canal e uma data/hora.");
        return;
    }

    const videoIndex = dadosSimulados.biblioteca.findIndex(v => v.id === videoId);
    if (videoIndex !== -1) {
        dadosSimulados.biblioteca[videoIndex].status = "Agendado";
        console.log(`Vídeo ID ${videoId} agendado para o canal ID ${channelId} em ${datetime}`);
    }

    renderizarTabelaBiblioteca();
    closeModal('schedule-modal');
});


// Evento para fechar modais clicando no fundo
document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal(modal.id);
        }
    });
});

// --- Inicialização ---

document.addEventListener('DOMContentLoaded', () => {
    navigateTo('dashboard');
    renderizarDashboard();
    feather.replace();
});
