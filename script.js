// ===================================================================
// PASSO 1: CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
// ===================================================================

const firebaseConfig = {
  apiKey: "AIzaSyDrKMIudQUfLS0j4tG-kEdkVksvSnZaIPQ",
  authDomain: "autopost-477601.firebaseapp.com",
  projectId: "autopost-477601",
  storageBucket: "autopost-477601.firebasestorage.app",
  messagingSenderId: "191333777971",
  appId: "1:191333777971:web:5aab90e1f1e39d19f61946",
  measurementId: "G-X4SBER5XVP"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ===================================================================
// VARIÁVEIS GLOBAIS E ESTADO DA APLICAÇÃO
// ===================================================================

let canaisCache = [];
let agendamentosCache = []; // Cache para os agendamentos
let canalAtual = null;

// ===================================================================
// LÓGICA DE AUTENTICAÇÃO E CONTROLE DE ACESSO
// ===================================================================

auth.onAuthStateChanged(user => {
    const loginPage = document.getElementById('login-page');
    const mainContainer = document.querySelector('.container');
    if (user) {
        loginPage.style.display = 'none';
        mainContainer.style.display = 'flex';
        feather.replace();
        renderizarDashboard();
    } else {
        loginPage.style.display = 'block';
        mainContainer.style.display = 'none';
    }
});

async function fazerLogin(email, password) {
    const errorMessage = document.getElementById('login-error-message');
    errorMessage.textContent = '';
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        console.error("Erro de login:", error.code);
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage.textContent = 'E-mail ou senha inválidos.';
        } else {
            errorMessage.textContent = 'Ocorreu um erro. Tente novamente.';
        }
    }
}

async function fazerLogout() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
    }
}

// ===================================================================
// FUNÇÕES DE RENDERIZAÇÃO (DESENHAR NA TELA)
// ===================================================================

async function renderizarDashboard() {
    const channelsTableBody = document.getElementById('channels-table').querySelector('tbody');
    channelsTableBody.innerHTML = '<tr><td colspan="5">Carregando canais...</td></tr>';
    try {
        const snapshot = await db.collection('canais').orderBy('id').get();
        canaisCache = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
        if (canaisCache.length === 0) {
            channelsTableBody.innerHTML = '<tr><td colspan="5">Nenhum canal encontrado.</td></tr>';
            return;
        }
        channelsTableBody.innerHTML = '';
        canaisCache.forEach(canal => {
            const tr = document.createElement('tr');
            const dataFormatada = canal.dataCriacao ? new Date(canal.dataCriacao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A';
            tr.innerHTML = `
                <td>#${canal.id}</td>
                <td>${canal.nome}</td>
                <td>${dataFormatada}</td>
                <td><span class="status ${canal.status ? canal.status.toLowerCase() : ''}">${canal.status || 'N/A'}</span></td>
                <td class="actions">
                    <button class="btn-icon-table" title="Gerenciar Canal" onclick="gerenciarCanal('${canal.docId}')"><i data-feather="arrow-right-circle"></i></button>
                    <button class="btn-icon-table edit-icon" title="Editar" onclick="openEditChannelModal('${canal.docId}')"><i data-feather="edit"></i></button>
                    <button class="btn-icon-table remove-icon" title="Remover" onclick="removerCanal('${canal.docId}')"><i data-feather="trash-2"></i></button>
                </td>
            `;
            channelsTableBody.appendChild(tr);
        });
        feather.replace();
    } catch (error) {
        console.error("Erro ao buscar canais: ", error);
        channelsTableBody.innerHTML = '<tr><td colspan="5">Erro ao carregar canais.</td></tr>';
    }
}

async function renderizarBiblioteca(canalId) {
    const videosTableBody = document.getElementById('videos-table').querySelector('tbody');
    const thumbnailsTableBody = document.getElementById('thumbnails-table').querySelector('tbody');
    videosTableBody.innerHTML = '<tr><td colspan="3">Carregando vídeos...</td></tr>';
    thumbnailsTableBody.innerHTML = '<tr><td colspan="3">Carregando thumbnails...</td></tr>';

    try {
        const videosRef = storage.ref(`canais/${canalId}/videos`);
        const thumbnailsRef = storage.ref(`canais/${canalId}/thumbnails`);

        const [videosRes, thumbnailsRes] = await Promise.all([
            videosRef.listAll(),
            thumbnailsRef.listAll()
        ]);

        if (videosRes.items.length === 0) {
            videosTableBody.innerHTML = '<tr><td colspan="3">Nenhum vídeo encontrado.</td></tr>';
        } else {
            videosTableBody.innerHTML = '';
            videosRes.items.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${item.name}</td><td>Disponível</td><td class="actions"><button class="btn-icon-table remove-icon" title="Remover"><i data-feather="trash-2"></i></button></td>`;
                videosTableBody.appendChild(tr);
            });
        }

        if (thumbnailsRes.items.length === 0) {
            thumbnailsTableBody.innerHTML = '<tr><td colspan="3">Nenhuma thumbnail encontrada.</td></tr>';
        } else {
            thumbnailsTableBody.innerHTML = '';
            thumbnailsRes.items.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${item.name}</td><td>Disponível</td><td class="actions"><button class="btn-icon-table remove-icon" title="Remover"><i data-feather="trash-2"></i></button></td>`;
                thumbnailsTableBody.appendChild(tr);
            });
        }
        feather.replace();
    } catch (error) {
        console.error("Erro ao listar arquivos da biblioteca:", error);
        videosTableBody.innerHTML = '<tr><td colspan="3">Erro ao carregar vídeos. Verifique o console (F12).</td></tr>';
        thumbnailsTableBody.innerHTML = '<tr><td colspan="3">Erro ao carregar thumbnails. Verifique o console (F12).</td></tr>';
    }
}

async function renderizarAgendamentos() {
    if (!canalAtual) return;
    const schedulesTableBody = document.getElementById('schedules-table').querySelector('tbody');
    schedulesTableBody.innerHTML = '<tr><td colspan="4">Carregando agendamentos...</td></tr>';
    try {
        const snapshot = await db.collection('agendamentos')
            .where('canalId', '==', canalAtual.docId)
            .orderBy('dataHoraPublicacao', 'asc')
            .get();
        
        agendamentosCache = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));

        if (agendamentosCache.length === 0) {
            schedulesTableBody.innerHTML = '<tr><td colspan="4">Nenhum agendamento encontrado.</td></tr>';
            return;
        }

        schedulesTableBody.innerHTML = '';
        agendamentosCache.forEach(agendamento => {
            const tr = document.createElement('tr');
            const dataHora = agendamento.dataHoraPublicacao.toDate();
            const dataFormatada = dataHora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const horaFormatada = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            tr.innerHTML = `
                <td>${agendamento.titulo}</td>
                <td>${dataFormatada} às ${horaFormatada}</td>
                <td><span class="status agendado">${agendamento.status}</span></td>
                <td class="actions">
                    <button class="btn-icon-table edit-icon" title="Editar Agendamento" onclick="openEditScheduleModal('${agendamento.docId}')"><i data-feather="edit"></i></button>
                    <button class="btn-icon-table remove-icon" title="Remover Agendamento" onclick="removerAgendamento('${agendamento.docId}')"><i data-feather="trash-2"></i></button>
                </td>
            `;
            schedulesTableBody.appendChild(tr);
        });
        feather.replace();
    } catch (error) {
        console.error("Erro ao buscar agendamentos: ", error);
        schedulesTableBody.innerHTML = '<tr><td colspan="4">Erro ao carregar agendamentos.</td></tr>';
    }
}

// ===================================================================
// LÓGICA DE NAVEGAÇÃO E GERENCIAMENTO DE PÁGINAS
// ===================================================================

function navigateTo(pageId) {
    document.querySelectorAll('.main-content > .page').forEach(page => page.classList.remove('active'));
    document.getElementById(`${pageId}-page`).classList.add('active');
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageId);
    });
}

function gerenciarCanal(docId) {
    canalAtual = canaisCache.find(c => c.docId === docId);
    if (!canalAtual) return;
    document.getElementById('channel-management-title').textContent = `Gerenciamento: ${canalAtual.nome}`;
    navigateTo('channel-management');
    switchSubpage('biblioteca');
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab-content`);
    });
}

function switchSubpage(subpageId) {
    document.querySelectorAll('.channel-page').forEach(page => {
        page.classList.toggle('active', page.id === `${subpageId}-subpage`);
    });
    document.querySelectorAll('.channel-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.subpage === subpageId);
    });
    if (subpageId === 'biblioteca') {
        renderizarBiblioteca(canalAtual.docId);
        switchTab('videos');
    } else if (subpageId === 'agendamento') {
        renderizarAgendamentos();
    }
}

// ===================================================================
// FUNÇÕES DE MANIPULAÇÃO DE DADOS (CRUD - Canais)
// ===================================================================

async function adicionarCanal(nome, youtubeId) {
    try {
        const ultimoCanalSnapshot = await db.collection('canais').orderBy('id', 'desc').limit(1).get();
        const novoId = ultimoCanalSnapshot.empty ? 1 : ultimoCanalSnapshot.docs[0].data().id + 1;
        await db.collection('canais').add({
            id: novoId,
            nome: nome,
            youtubeId: youtubeId,
            dataCriacao: new Date().toISOString().split('T')[0],
            status: 'Ativo'
        });
        renderizarDashboard();
        closeModal('channel-modal');
    } catch (error) {
        console.error("Erro ao adicionar canal: ", error);
    }
}

async function editarCanal(docId, nome, youtubeId) {
    try {
        await db.collection('canais').doc(docId).update({
            nome: nome,
            youtubeId: youtubeId
        });
        renderizarDashboard();
        closeModal('channel-modal');
    } catch (error) {
        console.error("Erro ao editar canal: ", error);
    }
}

async function removerCanal(docId) {
    if (confirm('Tem certeza que deseja remover este canal?')) {
        try {
            await db.collection('canais').doc(docId).delete();
            renderizarDashboard();
        } catch (error) {
            console.error("Erro ao remover canal: ", error);
        }
    }
}

// ===================================================================
// LÓGICA DE UPLOAD DE ARQUIVOS
// ===================================================================

function uploadFiles(files, path) {
    const fileArray = Array.from(files);
    fileArray.forEach(file => {
        const uploadTask = storage.ref(`${path}/${file.name}`).put(file);
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`Upload de ${file.name}: ${progress.toFixed(2)}% concluído.`);
            },
            (error) => {
                console.error(`Erro no upload de ${file.name}:`, error);
            },
            () => {
                console.log(`Upload de ${file.name} concluído com sucesso!`);
                renderizarBiblioteca(canalAtual.docId);
            }
        );
    });
}

// ===================================================================
// LÓGICA DE AGENDAMENTO EM MASSA (CSV e CRUD)
// ===================================================================

function logCsvStatus(message, type = 'info') {
    const statusDiv = document.getElementById('csv-status');
    const p = document.createElement('p');
    p.textContent = message;
    if (type === 'success') p.classList.add('log-success');
    if (type === 'error') p.classList.add('log-error');
    statusDiv.appendChild(p);
    statusDiv.scrollTop = statusDiv.scrollHeight;
}

async function processarCSV(file) {
    const statusDiv = document.getElementById('csv-status');
    statusDiv.innerHTML = '';
    logCsvStatus(`Iniciando processamento do arquivo: ${file.name}`);

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            logCsvStatus(`Arquivo lido. ${results.data.length} agendamentos encontrados.`);
            
            const agendamentosRef = db.collection('agendamentos');
            const batch = db.batch();

            for (const agendamento of results.data) {
                if (!agendamento.nome_video || !agendamento.data_publicacao || !agendamento.hora_publicacao) {
                    logCsvStatus(`ERRO: Linha inválida. Faltam dados obrigatórios. ${JSON.stringify(agendamento)}`, 'error');
                    continue;
                }

                const dataHoraPublicacao = new Date(`${agendamento.data_publicacao}T${agendamento.hora_publicacao}:00`);

                const novoAgendamento = {
                    canalId: canalAtual.docId,
                    nomeVideo: agendamento.nome_video,
                    nomeThumbnail: agendamento.nome_thumbnail || '',
                    titulo: agendamento.titulo || '',
                    descricao: agendamento.descricao || '',
                    tags: agendamento.tags || '',
                    dataHoraPublicacao: firebase.firestore.Timestamp.fromDate(dataHoraPublicacao),
                    status: 'Agendado',
                    dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
                };

                const docRef = agendamentosRef.doc();
                batch.set(docRef, novoAgendamento);
                logCsvStatus(`Agendamento para "${agendamento.titulo}" preparado.`);
            }

            try {
                await batch.commit();
                logCsvStatus(`SUCESSO: ${results.data.length} agendamentos foram salvos no banco de dados!`, 'success');
                renderizarAgendamentos();
            } catch (error) {
                console.error("Erro ao salvar agendamentos em lote: ", error);
                logCsvStatus(`ERRO FATAL: Não foi possível salvar os agendamentos no banco de dados.`, 'error');
            }
        },
        error: (error) => {
            console.error("Erro ao parsear CSV:", error);
            logCsvStatus(`ERRO: Não foi possível ler o arquivo CSV. Verifique o formato.`, 'error');
        }
    });
}

function baixarModeloCSV() {
    const header = "nome_video,nome_thumbnail,titulo,descricao,tags,data_publicacao,hora_publicacao\n";
    const blob = new Blob([header], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_agendamento.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function editarAgendamento(docId, dados) {
    try {
        const dataHora = new Date(`${dados.data_publicacao}T${dados.hora_publicacao}`);
        
        const dadosParaSalvar = {
            nomeVideo: dados.nome_video,
            nomeThumbnail: dados.nome_thumbnail,
            titulo: dados.titulo,
            descricao: dados.descricao,
            tags: dados.tags,
            dataHoraPublicacao: firebase.firestore.Timestamp.fromDate(dataHora)
        };

        await db.collection('agendamentos').doc(docId).update(dadosParaSalvar);
        renderizarAgendamentos();
        closeModal('schedule-modal');
    } catch (error) {
        console.error("Erro ao editar agendamento: ", error);
        alert("Não foi possível salvar as alterações.");
    }
}

async function removerAgendamento(docId) {
    if (confirm('Tem certeza que deseja remover este agendamento?')) {
        try {
            await db.collection('agendamentos').doc(docId).delete();
            renderizarAgendamentos();
        } catch (error) {
            console.error("Erro ao remover agendamento: ", error);
            alert("Não foi possível remover o agendamento.");
        }
    }
}

// ===================================================================
// MODAIS E INTERAÇÕES DA UI
// ===================================================================

function openModal(modalId) { document.getElementById(modalId).style.display = 'flex'; }
function closeModal(modalId) { document.getElementById(modalId).style.display = 'none'; }

function openAddChannelModal() {
    document.getElementById('channel-form').reset();
    document.getElementById('modal-title').textContent = 'Adicionar Novo Canal';
    document.getElementById('channel-id-input').value = '';
    openModal('channel-modal');
}

function openEditChannelModal(docId) {
    const canal = canaisCache.find(c => c.docId === docId);
    if (!canal) return;
    document.getElementById('modal-title').textContent = 'Editar Canal';
    document.getElementById('channel-id-input').value = docId;
    document.getElementById('channel-name').value = canal.nome;
    document.getElementById('channel-youtube-id').value = canal.youtubeId;
    openModal('channel-modal');
}

function openEditScheduleModal(docId) {
    const agendamento = agendamentosCache.find(a => a.docId === docId);
    if (!agendamento) return;

    document.getElementById('schedule-id-input').value = docId;
    document.getElementById('schedule-nome-video').value = agendamento.nomeVideo;
    document.getElementById('schedule-nome-thumbnail').value = agendamento.nomeThumbnail;
    document.getElementById('schedule-titulo').value = agendamento.titulo;
    document.getElementById('schedule-descricao').value = agendamento.descricao;
    document.getElementById('schedule-tags').value = agendamento.tags;

    const data = agendamento.dataHoraPublicacao.toDate();
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    const hora = String(data.getHours()).padStart(2, '0');
    const minuto = String(data.getMinutes()).padStart(2, '0');
    
    document.getElementById('schedule-data-publicacao').value = `${ano}-${mes}-${dia}`;
    document.getElementById('schedule-hora-publicacao').value = `${hora}:${minuto}`;
    
    openModal('schedule-modal');
}

// ===================================================================
// EVENT LISTENERS (OUVINTES DE EVENTOS)
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Formulário de Login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            fazerLogin(email, password);
        });
    }

    // Botão de Logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', fazerLogout);
    }

    // Navegação principal da Sidebar
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });

    // Botão para adicionar canal
    const btnAddChannel = document.getElementById('btn-add-channel');
    if (btnAddChannel) {
        btnAddChannel.addEventListener('click', openAddChannelModal);
    }

    // Formulário do modal de canal (Adicionar/Editar)
    const channelForm = document.getElementById('channel-form');
    if (channelForm) {
        channelForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const docId = document.getElementById('channel-id-input').value;
            const nome = document.getElementById('channel-name').value;
            const youtubeId = document.getElementById('channel-youtube-id').value;
            if (docId) {
                editarCanal(docId, nome, youtubeId);
            } else {
                adicionarCanal(nome, youtubeId);
            }
        });
    }

    // Formulário do modal de agendamento (Editar)
    const scheduleForm = document.getElementById('schedule-form');
    if (scheduleForm) {
        scheduleForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const docId = document.getElementById('schedule-id-input').value;
            const dados = {
                nome_video: document.getElementById('schedule-nome-video').value,
                nome_thumbnail: document.getElementById('schedule-nome-thumbnail').value,
                titulo: document.getElementById('schedule-titulo').value,
                descricao: document.getElementById('schedule-descricao').value,
                tags: document.getElementById('schedule-tags').value,
                data_publicacao: document.getElementById('schedule-data-publicacao').value,
                hora_publicacao: document.getElementById('schedule-hora-publicacao').value
            };
            editarAgendamento(docId, dados);
        });
    }

    // Botão de voltar para o dashboard
    const btnBack = document.getElementById('btn-back-to-dashboard');
    if (btnBack) {
        btnBack.addEventListener('click', () => navigateTo('dashboard'));
    }

    // Botões de upload na biblioteca
    const btnUploadVideos = document.getElementById('btn-upload-videos');
    const videoFileInput = document.getElementById('video-file-input');
    if (btnUploadVideos) {
        btnUploadVideos.addEventListener('click', () => videoFileInput.click());
        videoFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                uploadFiles(e.target.files, `canais/${canalAtual.docId}/videos`);
            }
        });
    }

    const btnUploadThumbnails = document.getElementById('btn-upload-thumbnails');
    const thumbnailFileInput = document.getElementById('thumbnail-file-input');
    if (btnUploadThumbnails) {
        btnUploadThumbnails.addEventListener('click', () => thumbnailFileInput.click());
        thumbnailFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                uploadFiles(e.target.files, `canais/${canalAtual.docId}/thumbnails`);
            }
        });
    }
    
    // Navegação das abas da biblioteca
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });

    // Navegação das subpáginas do canal
    document.querySelectorAll('.channel-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchSubpage(item.dataset.subpage);
        });
    });

    // Botão de importar CSV
    const btnImportCsv = document.getElementById('btn-import-csv');
    const csvFileInput = document.getElementById('csv-file-input');
    if(btnImportCsv) {
        btnImportCsv.addEventListener('click', () => csvFileInput.click());
        csvFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                processarCSV(e.target.files[0]);
            }
        });
    }

    // Botão de baixar modelo CSV
    const btnDownloadTemplate = document.getElementById('btn-download-csv-template');
    if (btnDownloadTemplate) {
        btnDownloadTemplate.addEventListener('click', baixarModeloCSV);
    }

    // Fechar modais
    document.querySelectorAll('.modal .close-button').forEach(button => {
        button.addEventListener('click', () => {
            closeModal(button.closest('.modal').id);
        });
    });
    window.addEventListener('click', (event) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (event.target == modal) {
                closeModal(modal.id);
            }
        });
    });
});
