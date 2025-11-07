// --- Dados Simulados Iniciais ---
const dadosSimulados = {
    canais: [
        { id: 1, nome: "Canal Principal", horario: "09:00", status: "Ativo" },
        { id: 2, nome: "Canal de Cortes", horario: "12:00", status: "Ativo" },
        { id: 3, nome: "Canal de Testes", horario: "15:00", status: "Inativo" },
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
                    <button class="btn-icon" title="Editar"><i data-feather="edit-2"></i></button>
                    <button class="btn-icon" title="Remover"><i data-feather="trash-2"></i></button>
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

// --- Funções do Modal (Pop-up) ---

const modal = document.getElementById('add-channel-modal');
const addChannelForm = document.getElementById('add-channel-form');

function openModal() {
    modal.classList.remove('hidden');
}

function closeModal() {
    modal.classList.add('hidden');
    addChannelForm.reset(); // Limpa o formulário ao fechar
}

// Lógica para salvar o novo canal (simulação)
addChannelForm.addEventListener('submit', (event) => {
    event.preventDefault(); // Impede o recarregamento da página

    const channelName = document.getElementById('channel-name').value;
    const channelId = document.getElementById('channel-id').value;

    const newChannel = {
        id: dadosSimulados.canais.length + 1,
        nome: channelName,
        horario: "N/A", // Novo canal ainda não tem horário definido
        status: "Ativo"
    };
    dadosSimulados.canais.push(newChannel);

    console.log("Novo canal adicionado (simulação):", newChannel);
    console.log("ID do YouTube (não usado ainda):", channelId);

    renderizarTabelaCanais(); // Re-desenha a tabela com o novo canal
    closeModal(); // Fecha o pop-up
});

// Fecha o modal se clicar fora do conteúdo
modal.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModal();
    }
});


// --- Inicialização ---

document.addEventListener('DOMContentLoaded', () => {
    navigateTo('dashboard');
    renderizarDashboard();
    feather.replace();
});
