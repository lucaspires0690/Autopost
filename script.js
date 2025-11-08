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

// Inicializa os serviços do Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ===================================================================
// VARIÁVEIS GLOBAIS E ESTADO DA APLICAÇÃO
// ===================================================================

let canaisCache = [];
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

// ***** NOVA FUNÇÃO *****
async function renderizarBiblioteca(canalId) {
    const videosTableBody = document.getElementById('videos-table').querySelector('tbody');
    videosTableBody.innerHTML = '<tr><td colspan="4">Carregando mídia...</td></tr>';

    try {
        const storageRef = storage.ref(`canais/${canalId}`);
        const res = await storageRef.listAll();
        
        const allFiles = [];
        // Pega os vídeos
        res.items.forEach(itemRef => {
            if (itemRef.parent.name === 'videos' || itemRef.parent.name === 'thumbnails') {
                 allFiles.push({
                    nome: itemRef.name,
                    tipo: itemRef.parent.name === 'videos' ? 'Vídeo' : 'Thumbnail',
                    ref: itemRef
                });
            }
        });
         // O listAll() não é recursivo, então precisamos listar as subpastas
        const videoPromises = res.prefixes.filter(p => p.name === 'videos').map(folderRef => folderRef.listAll());
        const thumbPromises = res.prefixes.filter(p => p.name === 'thumbnails').map(folderRef => folderRef.listAll());

        const folderResults = await Promise.all([...videoPromises, ...thumbPromises]);

        folderResults.forEach(folderRes => {
            folderRes.items.forEach(itemRef => {
                 allFiles.push({
                    nome: itemRef.name,
                    tipo: itemRef.parent.name === 'videos' ? 'Vídeo' : 'Thumbnail',
                    ref: itemRef
                });
            });
        });


        if (allFiles.length === 0) {
            videosTableBody.innerHTML = '<tr><td colspan="4">Nenhuma mídia encontrada. Faça o upload de vídeos e thumbnails.</td></tr>';
            return;
        }

        videosTableBody.innerHTML = '';
        allFiles.forEach(file => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${file.nome}</td>
                <td>${file.tipo}</td>
                <td>Disponível</td>
                <td class="actions">
                    <button class="btn-icon-table remove-icon" title="Remover"><i data-feather="trash-2"></i></button>
                </td>
            `;
            videosTableBody.appendChild(tr);
        });
        feather.replace();

    } catch (error) {
        console.error("Erro ao listar arquivos da biblioteca:", error);
        videosTableBody.innerHTML = '<tr><td colspan="4">Erro ao carregar mídia.</td></tr>';
    }
}


// ===================================================================
// LÓGICA DE NAVEGAÇÃO E GERENCIAMENTO DE PÁGINAS
// ===================================================================

function navigateTo(pageId) {
    document.querySelectorAll('.main-content .page').forEach(page => page.classList.remove('active'));
    document.getElementById(`${pageId}-page`).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageId);
    });
}

// ***** FUNÇÃO MODIFICADA *****
function gerenciarCanal(docId) {
    canalAtual = canaisCache.find(c => c.docId === docId);
    if (!canalAtual) return;
    document.getElementById('channel-management-title').textContent = `Gerenciamento: ${canalAtual.nome}`;
    navigateTo('channel-management');
    
    // Chama a nova função para carregar a biblioteca
    renderizarBiblioteca(canalAtual.docId); 
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
    if (!auth.currentUser) {
        alert("Erro: Você não está autenticado. Faça o login novamente.");
        return;
    }

    const pasta = tipo === 'video' ? 'videos' : 'thumbnails';
    
    Array.from(fileList).forEach(file => {
        console.log(`Iniciando upload de ${file.name}...`);
        
        const storagePath = `canais/${canalAtual.docId}/${pasta}/${file.name}`;
        const storageRef = storage.ref(storagePath);

        const task = storageRef.put(file);

        task.on('state_changed',
            function progress(snapshot) {
                const percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`Upload de ${file.name}: ${percentage.toFixed(2)}% concluído.`);
            },
            function error(err) {
                console.error(`Erro no upload de ${file.name}:`, err);
                alert(`Falha no upload de ${file.name}. Verifique o console (F12) para detalhes. O erro mais comum é de permissão.`);
            },
            function complete() {
                console.log(`Upload de ${file.name} concluído com sucesso!`);
                // Após o upload, atualiza a biblioteca para mostrar o novo arquivo
                renderizarBiblioteca(canalAtual.docId);
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
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        fazerLogin(email, password);
    });

    const btnLogout = document.getElementById('btn-logout');
    btnLogout.addEventListener('click', fazerLogout);

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });

    document.getElementById('btn-add-channel').addEventListener('click', openAddChannelModal);
    document.getElementById('btn-back-to-dashboard').addEventListener('click', () => navigateTo('dashboard'));

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

    const btnUploadVideos = document.getElementById('btn-upload-videos');
    const videoFileInput = document.getElementById('video-file-input');
    const btnUploadThumbnails = document.getElementById('btn-upload-thumbnails');
    const thumbnailFileInput = document.getElementById('thumbnail-file-input');

    btnUploadVideos.addEventListener('click', () => videoFileInput.click());
    videoFileInput.addEventListener('change', (e) => uploadFiles(e.target.files, 'video'));

    btnUploadThumbnails.addEventListener('click', () => thumbnailFileInput.click());
    thumbnailFileInput.addEventListener('change', (e) => uploadFiles(e.target.files, 'thumbnail'));
});
