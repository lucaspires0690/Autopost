// ===================================================================
// CONFIGURAÇÕES E INICIALIZAÇÃO (VERSÃO ESTÁVEL - SEM API DO GOOGLE)
// ===================================================================

const firebaseConfig = {
  apiKey: "AIzaSyC-Vd4Vv-bMvDx2nIPC", // A chave do seu firebaseConfig oficial
  authDomain: "autopost-477601.firebaseapp.com",
  projectId: "autopost-477601",
  storageBucket: "autopost-477601.appspot.com",
  messagingSenderId: "191333777971",
  appId: "1:191333777971:web:5aab90e1f1e39d19f61946",
  measurementId: "G-X4SBER5XVP"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Variáveis de estado globais
let currentUser = null;
let canalAtual = null;
let agendamentosCache = [];

// ===================================================================
// AUTENTICAÇÃO E GERENCIAMENTO DE PÁGINAS
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    const loginPage = document.getElementById('login-page');
    const appContainer = document.querySelector('.container');

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loginPage.style.display = 'none';
            appContainer.style.display = 'flex';
            feather.replace();
            carregarCanais();
        } else {
            currentUser = null;
            loginPage.style.display = 'block';
            appContainer.style.display = 'none';
        }
    });

    // Handlers de formulário e botões
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);
    document.getElementById('btn-add-channel').addEventListener('click', () => openModal('channel-modal'));
    
    // BOTÃO DE CONEXÃO COM YOUTUBE DESATIVADO NESTA VERSÃO
    const btnConnectYouTube = document.getElementById('btn-connect-youtube');
    if (btnConnectYouTube) {
        btnConnectYouTube.disabled = true;
        btnConnectYouTube.innerHTML = 'Conexão Indisponível';
        // Removido: .addEventListener('click', solicitarAcessoYouTube);
    }
    
    document.getElementById('btn-back-to-dashboard').addEventListener('click', () => mostrarPagina('dashboard'));

    // Navegação principal
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = item.getAttribute('data-page');
            mostrarPagina(pageId);
        });
    });

    // Navegação do canal
    document.querySelectorAll('.channel-sidebar .channel-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const subpageId = item.getAttribute('data-subpage');
            mostrarSubpagina(subpageId);
        });
    });

    // Handlers da Biblioteca
    document.getElementById('btn-upload-videos').addEventListener('click', () => document.getElementById('video-file-input').click());
    document.getElementById('video-file-input').addEventListener('change', handleFileUpload);
    document.getElementById('btn-upload-thumbnails').addEventListener('click', () => document.getElementById('thumbnail-file-input').click());
    document.getElementById('thumbnail-file-input').addEventListener('change', handleFileUpload);
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });

    // Handlers de Agendamento
    document.getElementById('btn-download-csv-template').addEventListener('click', baixarModeloCSV);
    document.getElementById('btn-import-csv').addEventListener('click', () => document.getElementById('csv-file-input').click());
    document.getElementById('csv-file-input').addEventListener('change', handleCsvImport);
    document.getElementById('schedule-form').addEventListener('submit', handleScheduleEdit);
    document.getElementById('btn-clear-schedules').addEventListener('click', limparTodosAgendamentos);

    // Handlers de modais
    document.querySelectorAll('.modal .close-button').forEach(button => {
        button.addEventListener('click', () => closeModal(button.closest('.modal').id));
    });
    window.addEventListener('click', (event) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (event.target == modal) closeModal(modal.id);
        });
    });
});

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorMessage = document.getElementById('login-error-message');

    auth.signInWithEmailAndPassword(email, password)
        .catch(error => {
            errorMessage.textContent = "E-mail ou senha inválidos.";
            console.error("Erro de login:", error);
        });
}

function handleLogout() {
    auth.signOut();
}

function mostrarPagina(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(`${pageId}-page`).classList.add('active');

    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageId);
    });
}

function mostrarSubpagina(subpageId) {
    document.querySelectorAll('.channel-page').forEach(page => page.classList.remove('active'));
    document.getElementById(`${subpageId}-subpage`).classList.add('active');

    document.querySelectorAll('.channel-sidebar .channel-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.subpage === subpageId);
    });
}

// ===================================================================
// GERENCIAMENTO DE CANAIS (VERSÃO SIMPLIFICADA SEM API)
// ===================================================================

async function carregarCanais() {
    if (!currentUser) return;
    const tableBody = document.getElementById('channels-table').querySelector('tbody');
    tableBody.innerHTML = '<tr><td colspan="5">Carregando canais...</td></tr>';

    try {
        const snapshot = await db.collection('usuarios').doc(currentUser.uid).collection('canais').orderBy('dataCriacao', 'desc').get();
        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="5">Nenhum canal adicionado ainda.</td></tr>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const canal = doc.data();
            html += `
                <tr data-id="${doc.id}" data-nome="${canal.nome}">
                    <td>${doc.id}</td>
                    <td>${canal.nome}</td>
                    <td>${canal.dataCriacao.toDate().toLocaleDateString()}</td>
                    <td><span class="status-badge active">Ativo</span></td>
                    <td class="actions">
                        <button class="btn-icon" onclick="entrarCanal('${doc.id}', '${canal.nome}')"><i data-feather="arrow-right-circle"></i></button>
                        <button class="btn-icon" onclick="excluirCanal('${doc.id}')"><i data-feather="trash-2"></i></button>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;
        feather.replace();
    } catch (error) {
        console.error("Erro ao carregar canais:", error);
        tableBody.innerHTML = '<tr><td colspan="5">Erro ao carregar canais.</td></tr>';
    }
}

// FUNÇÃO DE ADICIONAR CANAL REMOVIDA/SIMPLIFICADA
// A função abaixo é um placeholder e não conecta com o YouTube
function handleAddChannel(e) {
    e.preventDefault();
    // Esta função está vazia de propósito nesta versão estável
    alert("Funcionalidade de adicionar canal via API está temporariamente desativada para restaurar o login.");
    closeModal('channel-modal');
}


async function excluirCanal(channelId) {
    if (!confirm("Tem certeza que deseja excluir este canal e todos os seus dados (agendamentos, mídias)? Esta ação não pode ser desfeita.")) {
        return;
    }
    try {
        await db.collection('usuarios').doc(currentUser.uid).collection('canais').doc(channelId).delete();
        alert("Canal excluído com sucesso.");
        carregarCanais();
    } catch (error) {
        console.error("Erro ao excluir canal:", error);
        alert("Ocorreu um erro ao excluir o canal.");
    }
}

function entrarCanal(channelId, channelName) {
    canalAtual = { docId: channelId, nome: channelName };
    document.getElementById('channel-management-title').textContent = `Gerenciando: ${channelName}`;
    mostrarPagina('channel-management');
    mostrarSubpagina('biblioteca'); // Sempre começa na biblioteca
    carregarMidias();
    renderizarAgendamentos();
}

// ===================================================================
// MODAIS
// ===================================================================

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// ===================================================================
// BIBLIOTECA DE MÍDIA
// ===================================================================

function handleFileUpload(event) {
    const files = event.target.files;
    if (!files.length || !canalAtual) return;

    const isVideo = event.target.id === 'video-file-input';
    const folder = isVideo ? 'videos' : 'thumbnails';

    for (const file of files) {
        const filePath = `${currentUser.uid}/${canalAtual.docId}/${folder}/${file.name}`;
        const uploadTask = storage.ref(filePath).put(file);

        uploadTask.on('state_changed',
            (snapshot) => {
                // Progresso (opcional)
            },
            (error) => {
                console.error(`Erro no upload de ${file.name}:`, error);
                alert(`Erro ao enviar ${file.name}.`);
            },
            () => {
                console.log(`${file.name} enviado com sucesso.`);
                carregarMidias(); // Recarrega a lista de mídias
            }
        );
    }
}

async function carregarMidias() {
    if (!currentUser || !canalAtual) return;
    await carregarArquivosDaPasta('videos');
    await carregarArquivosDaPasta('thumbnails');
}

async function carregarArquivosDaPasta(folder) {
    const tableBody = document.getElementById(`${folder}-table`).querySelector('tbody');
    tableBody.innerHTML = `<tr><td colspan="3">Carregando...</td></tr>`;
    const folderPath = `${currentUser.uid}/${canalAtual.docId}/${folder}/`;

    try {
        const res = await storage.ref(folderPath).listAll();
        if (res.items.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3">Nenhum arquivo encontrado.</td></tr>`;
            return;
        }
        let html = '';
        res.items.forEach(itemRef => {
            html += `
                <tr>
                    <td>${itemRef.name}</td>
                    <td><span class="status-badge uploaded">Carregado</span></td>
                    <td class="actions">
                        <button class="btn-icon" onclick="excluirMidia('${itemRef.fullPath}')"><i data-feather="trash-2"></i></button>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;
        feather.replace();
    } catch (error) {
        console.error(`Erro ao listar ${folder}:`, error);
        tableBody.innerHTML = `<tr><td colspan="3">Erro ao carregar arquivos.</td></tr>`;
    }
}

async function excluirMidia(fullPath) {
    if (!confirm("Tem certeza que deseja excluir este arquivo?")) return;
    try {
        await storage.ref(fullPath).delete();
        alert("Arquivo excluído com sucesso.");
        carregarMidias();
    } catch (error) {
        console.error("Erro ao excluir mídia:", error);
        alert("Ocorreu um erro ao excluir o arquivo.");
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabId}-tab-content`).classList.add('active');
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tabId);
    });
}

// ===================================================================
// AGENDAMENTO EM MASSA
// ===================================================================

function baixarModeloCSV() {
    const header = "nome_video,nome_thumbnail,titulo,descricao,tags,data_publicacao,hora_publicacao";
    const content = "video1.mp4,thumb1.jpg,Meu Primeiro Vídeo,Esta é a descrição do vídeo.,tag1,tag2,2025-12-25,18:00";
    const csv = `${header}\n${content}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_agendamento.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function handleCsvImport(event) {
    const file = event.target.files[0];
    if (!file || !canalAtual) return;

    const statusBox = document.getElementById('csv-status');
    const logCsvStatus = (message, type = 'info') => {
        statusBox.innerHTML = `<p class="${type}">${message}</p>`;
    };

    logCsvStatus('Lendo arquivo CSV...');
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            logCsvStatus(`Arquivo lido. ${results.data.length} registros encontrados. Salvando no banco de dados...`);
            const batch = db.batch();
            results.data.forEach(row => {
                const dataHora = `${row.data_publicacao}T${row.hora_publicacao}:00`;
                const dataHoraTimestamp = firebase.firestore.Timestamp.fromDate(new Date(dataHora));

                const agendamentoRef = db.collection('agendamentos').doc();
                batch.set(agendamentoRef, {
                    canalId: canalAtual.docId,
                    nome_video: row.nome_video || '',
                    nome_thumbnail: row.nome_thumbnail || '',
                    titulo: row.titulo || '',
                    descricao: row.descricao || '',
                    tags: row.tags || '',
                    dataHoraPublicacao: dataHoraTimestamp,
                    status: 'Agendado'
                });
            });

            try {
                await batch.commit();
                logCsvStatus(`${results.data.length} agendamentos importados com sucesso!`, 'success');
                renderizarAgendamentos();
            } catch (error) {
                console.error("Erro ao salvar agendamentos:", error);
                logCsvStatus(`ERRO FATAL ao salvar no banco de dados.`, 'error');
            }
        },
        error: (error) => {
            console.error("Erro ao parsear CSV:", error);
            logCsvStatus(`ERRO: Não foi possível ler o arquivo CSV.`, 'error');
        }
    });
}

async function renderizarAgendamentos() {
    if (!currentUser || !canalAtual) return;
    const tableBody = document.getElementById('schedules-table').querySelector('tbody');
    tableBody.innerHTML = '<tr><td colspan="4">Carregando agendamentos...</td></tr>';

    try {
        const snapshot = await db.collection('agendamentos')
            .where('canalId', '==', canalAtual.docId)
            .orderBy('dataHoraPublicacao', 'asc')
            .get();

        agendamentosCache = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));

        if (agendamentosCache.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4">Nenhum agendamento na fila.</td></tr>';
            return;
        }

        let html = '';
        agendamentosCache.forEach(agendamento => {
            const data = agendamento.dataHoraPublicacao.toDate();
            const dataFormatada = data.toLocaleDateString() + ' ' + data.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            html += `
                <tr data-id="${agendamento.docId}">
                    <td>${agendamento.titulo}</td>
                    <td>${dataFormatada}</td>
                    <td><span class="status-badge scheduled">${agendamento.status}</span></td>
                    <td class="actions">
                        <button class="btn-icon" onclick="abrirModalEdicao('${agendamento.docId}')"><i data-feather="edit"></i></button>
                        <button class="btn-icon" onclick="excluirAgendamento('${agendamento.docId}')"><i data-feather="trash-2"></i></button>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;
        feather.replace();
    } catch (error) {
        console.error("Erro ao renderizar agendamentos:", error);
        tableBody.innerHTML = `<tr><td colspan="4">Erro ao carregar agendamentos. Verifique o console.</td></tr>`;
    }
}

function abrirModalEdicao(docId) {
    const agendamento = agendamentosCache.find(a => a.docId === docId);
    if (!agendamento) return;

    const data = agendamento.dataHoraPublicacao.toDate();
    const dataISO = data.toISOString().split('T')[0];
    const horaISO = data.toTimeString().split(' ')[0].substring(0, 5);

    document.getElementById('schedule-id-input').value = docId;
    document.getElementById('schedule-nome-video').value = agendamento.nome_video || '';
    document.getElementById('schedule-nome-thumbnail').value = agendamento.nome_thumbnail || '';
    document.getElementById('schedule-titulo').value = agendamento.titulo || '';
    document.getElementById('schedule-descricao').value = agendamento.descricao || '';
    document.getElementById('schedule-tags').value = agendamento.tags || '';
    document.getElementById('schedule-data-publicacao').value = dataISO;
    document.getElementById('schedule-hora-publicacao').value = horaISO;

    openModal('schedule-modal');
}

async function handleScheduleEdit(e) {
    e.preventDefault();
    const docId = document.getElementById('schedule-id-input').value;
    if (!docId) return;

    const data = document.getElementById('schedule-data-publicacao').value;
    const hora = document.getElementById('schedule-hora-publicacao').value;
    const dataHora = `${data}T${hora}:00`;
    const dataHoraTimestamp = firebase.firestore.Timestamp.fromDate(new Date(dataHora));

    const dadosAtualizados = {
        nome_video: document.getElementById('schedule-nome-video').value,
        nome_thumbnail: document.getElementById('schedule-nome-thumbnail').value,
        titulo: document.getElementById('schedule-titulo').value,
        descricao: document.getElementById('schedule-descricao').value,
        tags: document.getElementById('schedule-tags').value,
        dataHoraPublicacao: dataHoraTimestamp
    };

    try {
        await db.collection('agendamentos').doc(docId).update(dadosAtualizados);
        alert("Agendamento atualizado com sucesso!");
        closeModal('schedule-modal');
        renderizarAgendamentos();
    } catch (error) {
        console.error("Erro ao salvar alterações:", error);
        alert("Não foi possível salvar as alterações. Verifique o console.");
    }
}

async function excluirAgendamento(docId) {
    if (!confirm("Tem certeza que deseja excluir este agendamento?")) return;
    try {
        await db.collection('agendamentos').doc(docId).delete();
        alert("Agendamento excluído com sucesso.");
        renderizarAgendamentos();
    } catch (error) {
        console.error("Erro ao excluir agendamento:", error);
        alert("Ocorreu um erro ao excluir o agendamento.");
    }
}

async function limparTodosAgendamentos() {
    if (!canalAtual || agendamentosCache.length === 0) {
        alert("Não há agendamentos para limpar.");
        return;
    }
    if (!confirm(`Tem certeza que deseja excluir TODOS os ${agendamentosCache.length} agendamentos deste canal? Esta ação não pode ser desfeita.`)) {
        return;
    }

    const batch = db.batch();
    agendamentosCache.forEach(agendamento => {
        const docRef = db.collection('agendamentos').doc(agendamento.docId);
        batch.delete(docRef);
    });

    try {
        await batch.commit();
        alert("Todos os agendamentos foram excluídos com sucesso.");
        renderizarAgendamentos();
    } catch (error) {
        console.error("Erro ao limpar agendamentos:", error);
        alert("Ocorreu um erro ao limpar a fila de agendamentos.");
    }
}
