// --- Dados Simulados Iniciais ---
let dadosSimulados = {
    canais: [
        { id: 1, nome: "Canal Principal", youtubeId: "UC_x5XG1OV2P6uZZ5FSM9Ttw", horario: "09:00", status: "Ativo" },
        { id: 2, nome: "Canal de Cortes", youtubeId: "UC_anotherone", horario: "12:00", status: "Ativo" },
        { id: 3, nome: "Canal de Testes", youtubeId: "UC_andanother", horario: "15:00", status: "Inativo" },
    ],
    biblioteca: [
        { id: 1, nome: "video_final_01.mp4", duracao: "10:25", status: "Na Biblioteca", titulo: "", descricao: "", tags: "" },
        { id: 2, nome: "tutorial_novo_feature.mp4", duracao: "05:12", status: "Agendado", titulo: "Como usar a Nova Feature", descricao: "Neste tutorial completo, mostramos o passo a passo para ativar e usar a nova feature do nosso sistema.", tags: "tutorial, feature, guia" },
        { id: 3, nome: "video_antigo_01.mp4", duracao: "15:40", status: "Postado", titulo: "Review do Produto X", descricao: "Análise completa e sincera do produto X. Vale a pena comprar em 2025?", tags: "review, produto x, unboxing" },
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
                    <button class="btn-icon metadata-icon" title="Editar Metadados" onclick="openMetadataModal(${video.id})"><i data-feather="align-left"></i></button>
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
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    const targetLink = document.querySelector(`.nav-link[onclick="navigateTo('${pageId}')"]`);
    if (targetLink) {
        targetLink.classList.add('active');
    }

    feather.replace();

    if (pageId === 'library') {
        renderizarTabelaBiblioteca();
    }
    if (pageId === 'dashboard') {
        renderizarTabelaCanais();
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
        nome: `novo_video_${novoId}.mp4`,
        duracao: `${Math.floor(Math.random() * 10 + 5)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
        status: "Na Biblioteca",
        titulo: "",
        descricao: "",
        tags: ""
    };
    dadosSimulados.biblioteca.push(novoVideo);
    renderizarTabelaBiblioteca();
    renderizarDashboard();
    alert("Novo vídeo simulado adicionado à biblioteca!");
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
function openChannelModalForNew() {
    document.getElementById('channel-modal-title').textContent = 'Adicionar Novo Canal';
    document.getElementById('channel-form').reset();
    document.getElementById('channel-edit-id').value = '';
    document.getElementById('channel-modal').classList.remove('hidden');
}

function openChannelModalForEdit(id) {
    const canal = dadosSimulados.canais.find(c => c.id === id);
    if (!canal) return;

    document.getElementById('channel-modal-title').textContent = 'Editar Canal';
    document.getElementById('channel-edit-id').value = canal.id;
    document.getElementById('channel-name').value = canal.nome;
    document.getElementById('channel-id').value = canal.youtubeId;
    document.getElementById('channel-modal').classList.remove('hidden');
}

// Modal de Agendamento
function openScheduleModal(videoId) {
    const video = dadosSimulados.biblioteca.find(v => v.id === videoId);
    if (!video) return;

    document.getElementById('schedule-video-name').textContent = video.nome;
    document.getElementById('schedule-video-id').value = video.id;

    const channelSelect = document.getElementById('schedule-channel');
    channelSelect.innerHTML = '<option value="">Selecione um canal...</option>';
    dadosSimulados.canais.filter(c => c.status === 'Ativo').forEach(canal => {
        const option = document.createElement('option');
        option.value = canal.id;
        option.textContent = canal.nome;
        channelSelect.appendChild(option);
    });

    document.getElementById('schedule-modal').classList.remove('hidden');
}

// Modal de Metadados
function openMetadataModal(videoId) {
    const video = dadosSimulados.biblioteca.find(v => v.id === videoId);
    if (!video) return;

    document.getElementById('metadata-video-name').textContent = video.nome;
    document.getElementById('metadata-video-id').value = video.id;
    document.getElementById('metadata-title').value = video.titulo;
    document.getElementById('metadata-description').value = video.descricao;
    document.getElementById('metadata-tags').value = video.tags;

    document.getElementById('metadata-modal').classList.remove('hidden');
}

// --- Funções de Agendamento em Massa ---

function downloadModelo() {
    const cabecalho = "nome_do_arquivo,titulo_do_video,descricao,tags,nome_do_canal,data_hora_postagem (YYYY-MM-DD HH:MM)";
    const exemplo = "video_final_01.mp4,Meu Primeiro Vídeo,Esta é a descrição do meu primeiro vídeo.,tag1,tag2,Canal Principal,2025-12-25 10:00";
    const conteudoCsv = cabecalho + "\n" + exemplo;
    
    const blob = new Blob([conteudoCsv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_autopost.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert("O download do modelo da planilha foi iniciado.");
}

// --- Event Listeners para Formulários ---

document.addEventListener('DOMContentLoaded', () => {
    // Formulário de Canal
    document.getElementById('channel-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const id = document.getElementById('channel-edit-id').value;
        const nome = document.getElementById('channel-name').value;
        const youtubeId = document.getElementById('channel-id').value;

        if (id) { // Editando
            const canal = dadosSimulados.canais.find(c => c.id == id);
            if (canal) {
                canal.nome = nome;
                canal.youtubeId = youtubeId;
            }
        } else { // Criando
            const novoId = dadosSimulados.canais.length > 0 ? Math.max(...dadosSimulados.canais.map(c => c.id)) + 1 : 1;
            dadosSimulados.canais.push({ id: novoId, nome, youtubeId, horario: "N/A", status: "Ativo" });
        }
        renderizarDashboard();
        closeModal('channel-modal');
    });

    // Formulário de Agendamento
    document.getElementById('schedule-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const videoId = document.getElementById('schedule-video-id').value;
        const video = dadosSimulados.biblioteca.find(v => v.id == videoId);
        if (video) {
            video.status = 'Agendado';
            renderizarTabelaBiblioteca();
            alert(`Vídeo "${video.nome}" agendado com sucesso!`);
        }
        closeModal('schedule-modal');
    });

    // Formulário de Metadados
    document.getElementById('metadata-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const videoId = document.getElementById('metadata-video-id').value;
        const video = dadosSimulados.biblioteca.find(v => v.id == videoId);
        if (video) {
            video.titulo = document.getElementById('metadata-title').value;
            video.descricao = document.getElementById('metadata-description').value;
            video.tags = document.getElementById('metadata-tags').value;
            alert(`Metadados do vídeo "${video.nome}" salvos com sucesso!`);
        }
        closeModal('metadata-modal');
    });

    // Listener para o input de upload de CSV
    document.getElementById('csv-upload-input').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            alert(`Arquivo "${file.name}" selecionado. A lógica para processar o arquivo será implementada no próximo passo.`);
            // Futuramente, aqui chamaremos a função para ler e processar o CSV.
            e.target.value = ''; // Limpa o input para permitir selecionar o mesmo arquivo novamente
        }
    });
});

// --- Inicialização ---

document.addEventListener('DOMContentLoaded', () => {
    navigateTo('dashboard');
    renderizarDashboard();
    feather.replace();
});
