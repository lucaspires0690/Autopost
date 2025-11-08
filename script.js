// ===================================================================
// PASSO 1: CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
// ===================================================================

const firebaseConfig = {
  apiKey: "AIzaSyDrKMIudQUfLS0j4tG-kEdkVksvSnZaIPQ",
  authDomain: "autopost-477601.firebaseapp.com",
  projectId: "autopost-477601",
  storageBucket: "autopost-477601.appspot.com", // ATENÇÃO: O domínio do Storage é diferente!
  messagingSenderId: "191333777971",
  appId: "1:191333777971:web:5aab90e1f1e39d19f61946",
  measurementId: "G-X4SBER5XVP"
};

// Inicializa os serviços do Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage(); // Nova inicialização para o Storage

// ===================================================================
// VARIÁVEIS GLOBAIS E ESTADO DA APLICAÇÃO
// ===================================================================

let canaisCache = [];
let canalAtual = null; // Guarda o objeto do canal que está sendo gerenciado

// ===================================================================
// FUNÇÕES DE RENDERIZAÇÃO (DESENHAR NA TELA)
// ===================================================================

async function renderizarDashboard() {
    const channelsTableBody = document.getElementById('channels-table').querySelector('tbody');
    channelsTableBody.innerHTML = '<tr><td colspan="5">Carregando canais da nuvem...</td></tr>';

    try {
        const snapshot = await db.collection('canais').orderBy('id').get();
        canaisCache = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
        
        if (canaisCache.length === 0) {
            channelsTableBody.innerHTML = '<tr><td colspan="5">Nenhum canal encontrado. Adicione um novo canal.</td></tr>';
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
        channelsTableBody.innerHTML = '<tr><td colspan="5">Erro ao carregar canais. Verifique o console (F12).</td></tr>';
    }
}

// ===================================================================
// LÓGICA DE NAVEGAÇÃO E GERENCIAMENTO DE PÁGINAS
// ===================================================================

function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(`${pageId}-page`).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageId);
    });
}

function gerenciarCanal(docId) {
    canalAtual = canaisCache.find(c => c.docId === docId);
    if (!canalAtual) return;
    document.getElementById('channel-management-title').textContent = `Gerenciamento: ${canalAtual.nome}`;
    navigateTo('channel-management');
    // Futuramente, aqui carregaremos os vídeos deste canal
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
    } catch (error) {
        console.error("Erro ao adicionar canal: ", error);
    }
}

async function removerCanal(docId) {
    if (confirm("Tem certeza que deseja remover este canal?")) {
        try {
            await db.collection('canais').doc(docId).delete();
            renderizarDashboard();
        } catch (error) {
            console.error("Erro ao remover canal: ", error);
        }
    }
}

async function editarCanal(docId, nome, youtubeId) {
    try {
        await db.collection('canais').doc(docId).update({
            nome: nome,
            youtubeId: youtubeId
        });
        renderizarDashboard();
    } catch (error) {
        console.error("Erro ao editar canal: ", error);
    }
}

// ===================================================================
// FUNÇÕES DE UPLOAD (Cloud Storage)
// ===================================================================

function uploadFiles(fileList, tipo) {
    if (!canalAtual) {
        alert("Erro: Nenhum canal selecionado para o upload.");
        return;
    }

    const pasta = tipo === 'video' ? 'videos' : 'thumbnails';
    
    // Transforma a FileList em um Array para usar o forEach
    Array.from(fileList).forEach(file => {
        console.log(`Iniciando upload de ${file.name}...`);
        
        // Cria o caminho no Storage: canais/{id_do_canal}/videos/{nome_do_arquivo}
        const storagePath = `canais/${canalAtual.docId}/${pasta}/${file.name}`;
        const storageRef = storage.ref(storagePath);

        const task = storageRef.put(file);

        // Acompanha o progresso do upload
        task.on('state_changed',
            function progress(snapshot) {
                const percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`Upload de ${file.name}: ${percentage.toFixed(2)}% concluído.`);
            },
            function error(err) {
                console.error(`Erro no upload de ${file.name}:`, err);
            },
            function complete() {
                console.log(`Upload de ${file.name} concluído com sucesso!`);
                // Futuramente, aqui vamos atualizar a tabela da biblioteca
            }
        );
    });
}


// ===================================================================
// FUNÇÕES DOS MODAIS (Pop-ups)
// ===================================================================

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

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
    document.getElementById('channel-id-input').value = canal.docId;
    document.getElementById('channel-name').value = canal.nome;
    document.getElementById('channel-youtube-id').value = canal.youtubeId;
    openModal('channel-modal');
}

// ===================================================================
// EVENT LISTENERS (OUVINTES DE EVENTOS)
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Navegação principal
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });

    // Botões do Dashboard
    document.getElementById('btn-add-channel').addEventListener('click', openAddChannelModal);
    document.getElementById('btn-back-to-dashboard').addEventListener('click', () => navigateTo('dashboard'));

    // Formulário de Canal
    document.getElementById('channel-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const docId = document.getElementById('channel-id-input').value;
        const nome = document.getElementById('channel-name').value;
        const youtubeId = document.getElementById('channel-youtube-id').value;

        if (docId) {
            editarCanal(docId, nome, youtubeId);
        } else {
            adicionarCanal(nome, youtubeId);
        }
        closeModal('channel-modal');
    });

    // --- NOVOS EVENTOS DE UPLOAD ---
    const btnUploadVideos = document.getElementById('btn-upload-videos');
    const videoFileInput = document.getElementById('video-file-input');
    const btnUploadThumbnails = document.getElementById('btn-upload-thumbnails');
    const thumbnailFileInput = document.getElementById('thumbnail-file-input');

    // Aciona o input de vídeo quando o botão for clicado
    btnUploadVideos.addEventListener('click', () => videoFileInput.click());
    // Chama a função de upload quando arquivos de vídeo forem selecionados
    videoFileInput.addEventListener('change', (e) => uploadFiles(e.target.files, 'video'));

    // Aciona o input de thumbnail quando o botão for clicado
    btnUploadThumbnails.addEventListener('click', () => thumbnailFileInput.click());
    // Chama a função de upload quando arquivos de thumbnail forem selecionados
    thumbnailFileInput.addEventListener('change', (e) => uploadFiles(e.target.files, 'thumbnail'));


    // Inicialização
    navigateTo('dashboard');
    renderizarDashboard();
});
