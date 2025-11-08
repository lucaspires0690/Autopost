// =================================================================================
// PARTE 1: DADOS E RENDERIZAÇÃO
// =================================================================================

let dadosSimulados = {
    canais: [
        { id: 1, nome: "Canal Principal", youtubeId: "UC_x5XG1OV2P6uZZ5FSM9Ttw", horario: "09:00", status: "Ativo" },
        { id: 2, nome: "Canal de Cortes", youtubeId: "UC_anotherone", horario: "12:00", status: "Ativo" },
        { id: 3, nome: "Canal de Testes", youtubeId: "UC_andanother", horario: "15:00", status: "Inativo" },
    ],
    biblioteca: [
        // Vídeos do Canal Principal (id: 1)
        { id: 1, idCanal: 1, nome: "video_final_01.mp4", duracao: "10:25", status: "Na Biblioteca", titulo: "Título Padrão 1", descricao: "Descrição padrão 1.", tags: "tag1" },
        { id: 2, idCanal: 1, nome: "tutorial_novo_feature.mp4", duracao: "05:12", status: "Agendado", titulo: "Como usar a Nova Feature", descricao: "Neste tutorial completo, mostramos o passo a passo para ativar e usar a nova feature do nosso sistema.", tags: "tutorial, feature, guia" },
        
        // Vídeos do Canal de Cortes (id: 2)
        { id: 3, idCanal: 2, nome: "corte_podcast_ep15.mp4", duracao: "01:15", status: "Postado", titulo: "Melhor Momento do Podcast #15", descricao: "O trecho mais engraçado do nosso último podcast.", tags: "podcast, cortes, comedia" },
        { id: 4, idCanal: 2, nome: "reacao_trailer_filme.mp4", duracao: "03:40", status: "Na Biblioteca", titulo: "Reagindo ao Trailer", descricao: "Minha reação sincera ao novo trailer do filme de ação.", tags: "react, trailer, reacao" },

        // Vídeos do Canal de Testes (id: 3)
        { id: 5, idCanal: 3, nome: "teste_upload_001.mp4", duracao: "00:30", status: "Na Biblioteca", titulo: "Vídeo de Teste", descricao: "Apenas um teste.", tags: "teste" },
    ],
    agendamentosHoje: 1,
    falhas: 0,
    linhasPlanilha: [],
    canalSelecionadoId: null, // Novo: para saber qual canal está ativo na biblioteca
};

function renderizarTabelaCanais() {
    const tbody = document.querySelector("#canais-table-dashboard tbody");
    if (!tbody) return;
    tbody.innerHTML = '';
    dadosSimulados.canais.forEach(canal => {
        const tr = `
            <tr>
                <td>${canal.nome}</td>
                <td>Hoje às ${canal.horario}</td>
                <td><span class="status-badge ${canal.status === 'Ativo' ? 'status-ativo' : 'status-inativo'}">${canal.status}</span></td>
                <td>
                    <button class="btn-icon edit-icon" title="Editar" onclick="openChannelModalForEdit(${canal.id})"><i data-feather="edit-2"></i></button>
                    <button class="btn-icon remove-icon" title="Remover" onclick="removerCanal(${canal.id})"><i data-feather="trash-2"></i></button>
                </td>
            </tr>`;
        tbody.innerHTML += tr;
    });
    feather.replace();
}

function renderizarTabelaBiblioteca(idCanal) {
    const tbody = document.querySelector("#library-table tbody");
    if (!tbody) return;
    tbody.innerHTML = '';
    const videosDoCanal = dadosSimulados.biblioteca.filter(v => v.idCanal === idCanal);

    if (videosDoCanal.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px;">Nenhum vídeo encontrado para este canal.</td></tr>';
        return;
    }

    videosDoCanal.forEach(video => {
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
            </tr>`;
        tbody.innerHTML += tr;
    });
    feather.replace();
}

function renderizarListaDeCanaisNaBiblioteca() {
    const grid = document.querySelector("#library-channel-list .channel-grid");
    if (!grid) return;
    grid.innerHTML = '';
    dadosSimulados.canais.forEach(canal => {
        const videosNesteCanal = dadosSimulados.biblioteca.filter(v => v.idCanal === canal.id).length;
        const videosAgendados = dadosSimulados.biblioteca.filter(v => v.idCanal === canal.id && v.status === 'Agendado').length;
        const card = `
            <div class="channel-card" onclick="showVideoList(${canal.id})">
                <div class="channel-card-header">
                    <i data-feather="tv" class="channel-card-icon"></i>
                    <span class="channel-card-name">${canal.nome}</span>
                </div>
                <div class="channel-card-stats">
                    <span>${videosNesteCanal} vídeos</span>
                    <span>${videosAgendados} agendados</span>
                </div>
            </div>
        `;
        grid.innerHTML += card;
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

// =================================================================================
// PARTE 2: NAVEGAÇÃO E FUNÇÕES GERAIS
// =================================================================================

function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector(`.nav-link[onclick="navigateTo('${pageId}')"]`)?.classList.add('active');
    
    if (pageId === 'library') showChannelList();
    if (pageId === 'dashboard') renderizarDashboard();
    if (pageId === 'bulk-schedule') document.getElementById('bulk-results-section').classList.add('hidden');
    
    feather.replace();
}

function showChannelList() {
    document.getElementById('library-title').textContent = 'Biblioteca de Mídia';
    document.getElementById('library-upload-btn').classList.add('hidden');
    document.getElementById('library-channel-list').classList.remove('hidden');
    document.getElementById('library-video-list').classList.add('hidden');
    renderizarListaDeCanaisNaBiblioteca();
}

function showVideoList(idCanal) {
    const canal = dadosSimulados.canais.find(c => c.id === idCanal);
    if (!canal) return;
    dadosSimulados.canalSelecionadoId = idCanal;
    document.getElementById('library-title').textContent = `Biblioteca: ${canal.nome}`;
    document.getElementById('library-upload-btn').classList.remove('hidden');
    document.getElementById('library-channel-list').classList.add('hidden');
    document.getElementById('library-video-list').classList.remove('hidden');
    renderizarTabelaBiblioteca(idCanal);
}

function closeModal(modalId) {
    document.getElementById(modalId)?.classList.add('hidden');
}

// =================================================================================
// PARTE 3: FUNÇÕES DE CRUD (CANAIS E VÍDEOS)
// =================================================================================

function removerCanal(id) {
    if (confirm("Tem certeza que deseja remover este canal? Isso também removerá todos os vídeos associados a ele.")) {
        dadosSimulados.canais = dadosSimulados.canais.filter(c => c.id !== id);
        dadosSimulados.biblioteca = dadosSimulados.biblioteca.filter(v => v.idCanal !== id);
        renderizarDashboard();
        // Se estiver na página da biblioteca, volta para a lista de canais
        if (document.getElementById('library').classList.contains('active')) {
            showChannelList();
        }
    }
}

function simularUpload() {
    if (!dadosSimulados.canalSelecionadoId) {
        alert("Erro: Nenhum canal selecionado.");
        return;
    }
    const novoId = dadosSimulados.biblioteca.length > 0 ? Math.max(...dadosSimulados.biblioteca.map(v => v.id)) + 1 : 1;
    dadosSimulados.biblioteca.push({ 
        id: novoId, 
        idCanal: dadosSimulados.canalSelecionadoId,
        nome: `novo_video_${novoId}.mp4`, 
        duracao: "00:00", 
        status: "Na Biblioteca", 
        titulo: `Título Padrão ${novoId}`, 
        descricao: `Descrição padrão ${novoId}.`, 
        tags: `tag${novoId}` 
    });
    showVideoList(dadosSimulados.canalSelecionadoId); // Re-renderiza a lista de vídeos do canal atual
    renderizarDashboard();
    alert("Novo vídeo simulado adicionado a este canal!");
}

function removerVideo(id) {
    if (confirm("Tem certeza que deseja remover este vídeo da biblioteca?")) {
        dadosSimulados.biblioteca = dadosSimulados.biblioteca.filter(v => v.id !== id);
        showVideoList(dadosSimulados.canalSelecionadoId); // Re-renderiza a lista de vídeos do canal atual
        renderizarDashboard();
    }
}

// =================================================================================
// PARTE 4: FUNÇÕES DOS MODAIS (POPUPS)
// =================================================================================

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

function openScheduleModal(videoId) {
    const video = dadosSimulados.biblioteca.find(v => v.id === videoId);
    if (!video) return;
    document.getElementById('schedule-video-name').textContent = video.nome;
    document.getElementById('schedule-video-id').value = video.id;
    const channelSelect = document.getElementById('schedule-channel');
    channelSelect.innerHTML = ''; // Limpa
    // No agendamento individual, só permite agendar para o canal ao qual o vídeo pertence
    const canalDoVideo = dadosSimulados.canais.find(c => c.id === video.idCanal);
    if (canalDoVideo) {
        channelSelect.innerHTML += `<option value="${canalDoVideo.id}" selected>${canalDoVideo.nome}</option>`;
        channelSelect.disabled = true; // Desativa a seleção, pois o canal já está definido
    }
    document.getElementById('schedule-modal').classList.remove('hidden');
}

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

// =================================================================================
// PARTE 5: AGENDAMENTO EM MASSA
// =================================================================================

function exportarPlanilhaParaAgendar() {
    const videosParaAgendar = dadosSimulados.biblioteca.filter(v => v.status === 'Na Biblioteca');
    if (videosParaAgendar.length === 0) {
        alert("Não há vídeos 'Na Biblioteca' para exportar.");
        return;
    }

    const separador = ';';
    const cabecalho = ["nome_do_arquivo", "titulo_do_video", "descricao", "tags", "nome_do_canal", "data_postagem (YYYY-MM-DD)", "hora_postagem (HH:MM)"].join(separador);
    
    let dataAtual = new Date();
    const linhas = videosParaAgendar.map(video => {
        const canalDoVideo = dadosSimulados.canais.find(c => c.id === video.idCanal);
        dataAtual.setDate(dataAtual.getDate() + 1);
        const dataFormatada = dataAtual.toISOString().split('T')[0];
        const descricaoProtegida = `"${video.descricao.replace(/"/g, '""')}"`;
        
        return [
            video.nome,
            video.titulo,
            descricaoProtegida,
            video.tags,
            canalDoVideo ? canalDoVideo.nome : '', // Pré-preenche com o canal do vídeo
            dataFormatada,
            canalDoVideo ? canalDoVideo.horario : '09:00' // Usa o horário do canal ou um padrão
        ].join(separador);
    });

    const conteudoCsv = "\uFEFF" + cabecalho + "\n" + linhas.join("\n");
    
    const blob = new Blob([conteudoCsv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "autopost_para_preencher.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function processarResultadosPlanilha(results) {
    const tbody = document.querySelector("#bulk-preview-table tbody");
    tbody.innerHTML = '';
    dadosSimulados.linhasPlanilha = [];

    results.data.forEach(linha => {
        const nomeArquivo = linha.nome_do_arquivo;
        const nomeCanal = linha.nome_do_canal;
        const data = linha["data_postagem (YYYY-MM-DD)"];
        const hora = linha["hora_postagem (HH:MM)"];
        const dataHora = `${data} ${hora}`;
        
        const video = dadosSimulados.biblioteca.find(v => v.nome === nomeArquivo);
        const canal = dadosSimulados.canais.find(c => c.nome === nomeCanal && c.status === 'Ativo');
        
        let erro = '';
        if (!video) erro = 'Vídeo não encontrado na biblioteca.';
        else if (video.idCanal !== canal?.id) erro = 'Vídeo não pertence a este canal.'; // Nova validação
        else if (video.status !== 'Na Biblioteca') erro = 'Vídeo já agendado ou postado.';
        else if (!canal) erro = 'Canal não encontrado ou inativo.';
        else if (!data || !hora || isNaN(new Date(dataHora).getTime())) erro = 'Data ou hora inválida.';

        const linhaProcessada = { ...linha, erro: erro };
        dadosSimulados.linhasPlanilha.push(linhaProcessada);

        const statusClass = erro ? 'status-invalido' : 'status-valido';
        const statusText = erro || 'Pronto para agendar';

        const tr = `
            <tr>
                <td>${nomeArquivo || 'N/A'}</td>
                <td>${nomeCanal || 'N/A'}</td>
                <td>${dataHora || 'N/A'}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            </tr>`;
        tbody.innerHTML += tr;
    });

    document.getElementById('bulk-results-section').classList.remove('hidden');
    const linhasValidas = dadosSimulados.linhasPlanilha.filter(l => !l.erro).length;
    document.querySelector('.bulk-confirm-footer button').disabled = linhasValidas === 0;
    feather.replace();
}

function confirmarAgendamentoEmMassa() {
    const linhasParaAgendar = dadosSimulados.linhasPlanilha.filter(l => !l.erro);
    if (linhasParaAgendar.length === 0) {
        alert("Nenhuma linha válida para agendar.");
        return;
    }

    if (confirm(`Você está prestes a agendar ${linhasParaAgendar.length} vídeo(s). Deseja continuar?`)) {
        linhasParaAgendar.forEach(linha => {
            const video = dadosSimulados.biblioteca.find(v => v.nome === linha.nome_do_arquivo);
            if (video) {
                video.status = 'Agendado';
                video.titulo = linha.titulo_do_video;
                video.descricao = linha.descricao;
                video.tags = linha.tags;
            }
        });

        alert(`${linhasParaAgendar.length} vídeo(s) foram agendados com sucesso!`);
        document.getElementById('bulk-results-section').classList.add('hidden');
    }
}

// =================================================================================
// PARTE 6: EVENT LISTENERS E INICIALIZAÇÃO
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Formulário de Canal
    document.getElementById('channel-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const id = document.getElementById('channel-edit-id').value;
        const nome = document.getElementById('channel-name').value;
        const youtubeId = document.getElementById('channel-id').value;
        if (id) {
            const canal = dadosSimulados.canais.find(c => c.id == id);
            if (canal) { canal.nome = nome; canal.youtubeId = youtubeId; }
        } else {
            const novoId = dadosSimulados.canais.length > 0 ? Math.max(...dadosSimulados.canais.map(c => c.id)) + 1 : 1;
            dadosSimulados.canais.push({ id: novoId, nome, youtubeId, horario: "09:00", status: "Ativo" });
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
            showVideoList(video.idCanal); // Re-renderiza a lista de vídeos do canal atual
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
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                delimiter: ";",
                complete: processarResultadosPlanilha
            });
            e.target.value = '';
        }
    });

    // Inicialização da aplicação
    navigateTo('dashboard');
});
