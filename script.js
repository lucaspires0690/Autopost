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
    ],
    agendamentosHoje: 1,
    falhas: 0,
};

// --- Funções de Renderização ---

function renderizarTabelaCanais() {
    const tbody = document.querySelector("#canais-table-dashboard tbody");
    tbody.innerHTML = ''; // Limpa a tabela antes de redesenhar

    dadosSimulados.canais.forEach(canal => {
        const statusClass = canal.status === 'Ativo' ? 'status-ativo' : 'status-inativo';
        const tr = `
            <tr>
                <td>${canal.nome}</td>
                <td>Hoje às ${canal.horario}</td>
                <td><span class="status-badge ${statusClass}">${canal.status}</span></td>
                <td>
                    <button class="btn-icon" title="Editar" onclick="openModalForEdit(${canal.id})"><i data-feather="edit-2"></i></button>
                    <button class="btn-icon" title="Remover" onclick="removerCanal(${canal.id})"><i data-feather="trash-2"></i></button>
                </td>
            </tr>
        `;
        tbody.innerHTML += tr;
    });
    feather.replace(); // Re-aplica os ícones
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
}

// --- Funções de CRUD (Create, Read, Update, Delete) para Canais ---

function removerCanal(id) {
    const confirmacao = confirm("Tem certeza que deseja remover este canal?");
    if (confirmacao) {
        dadosSimulados.canais = dadosSimulados.canais.filter(canal => canal.id !== id);
        renderizarDashboard();
    }
}

// --- Funções do Modal (Pop-up) ---

const modal = document.getElementById('channel-modal');
const channelForm = document.getElementById('channel-form');
const modalTitle = document.getElementById('modal-title');
const channelEditId = document.getElementById('channel-edit-id');

function openModalForNew() {
    channelForm.reset();
    modalTitle.textContent = "Adicionar Novo Canal";
    channelEditId.value = "";
    modal.classList.remove('hidden');
}

function openModalForEdit(id) {
    const canalParaEditar = dadosSimulados.canais.find(canal => canal.id === id);
    if (canalParaEditar) {
        modalTitle.textContent = "Editar Canal";
        channelEditId.value = id;
        document.getElementById('channel-name').value = canalParaEditar.nome;
        document.getElementById('channel-id').value = canalParaEditar.youtubeId;
        modal.classList.remove('hidden');
    }
}

function closeModal() {
    modal.classList.add('hidden');
    channelForm.reset();
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
        const newChannel = {
            id: novoId,
            nome: nome,
            youtubeId: youtubeId,
            horario: "N/A",
            status: "Ativo"
        };
        dadosSimulados.canais.push(newChannel);
    }
    renderizarDashboard();
    closeModal();
});

modal.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

// --- Inicialização ---

document.addEventListener('DOMContentLoaded', () => {
    // CORREÇÃO: Atribui a função correta ao botão principal
    const addChannelButton = document.querySelector('.main-header .btn-primary');
    if (addChannelButton) {
        addChannelButton.setAttribute('onclick', 'openModalForNew()');
    }

    navigateTo('dashboard');
    renderizarDashboard();
    feather.replace();
});
