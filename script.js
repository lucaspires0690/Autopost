// ===================================================================
// PASSO 1: CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
// ===================================================================

// Cole aqui a configuração do Firebase que você copiou
const firebaseConfig = {
  apiKey: "AIzaSyDrKMIudQUfLS0j4tG-kEdkVksvSnZaIPQ",
  authDomain: "autopost-477601.firebaseapp.com",
  projectId: "autopost-477601",
  storageBucket: "autopost-477601.firebasestorage.app",
  messagingSenderId: "191333777971",
  appId: "1:191333777971:web:5aab90e1f1e39d19f61946",
  measurementId: "G-X4SBER5XVP"
};


// Inicializa o Firebase e o Firestore
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ===================================================================
// VARIÁVEIS GLOBAIS E ESTADO DA APLICAÇÃO
// ===================================================================

let canaisCache = []; // Armazena os canais carregados para não recarregar toda hora
let videosCache = []; // Armazena os vídeos do canal selecionado
let canalAtual = null; // Guarda o ID do canal que está sendo gerenciado

// ===================================================================
// FUNÇÕES DE RENDERIZAÇÃO (DESENHAR NA TELA)
// ===================================================================

// Renderiza a tabela de canais no Dashboard
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
            tr.innerHTML = `
                <td>#${canal.id}</td>
                <td>${canal.nome}</td>
                <td>${new Date(canal.dataCriacao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                <td><span class="status ${canal.status.toLowerCase()}">${canal.status}</span></td>
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
        channelsTableBody.innerHTML = '<tr><td colspan="5">Erro ao carregar canais. Verifique o console.</td></tr>';
    }
}


// ===================================================================
// LÓGICA DE NAVEGAÇÃO
// ===================================================================

// Navega entre as páginas principais (Dashboard, Configurações)
function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(`${pageId}-page`).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageId);
    });
}

// Abre a página de gerenciamento de um canal específico
function gerenciarCanal(docId) {
    canalAtual = canaisCache.find(c => c.docId === docId);
    if (!canalAtual) return;

    document.getElementById('channel-management-title').textContent = `Gerenciamento: ${canalAtual.nome}`;
    navigateTo('channel-management');
    // Futuramente, aqui carregaremos os vídeos deste canal
    // renderizarBibliotecaCanal(); 
}

// ===================================================================
// FUNÇÕES DE MANIPULAÇÃO DE DADOS (CRUD - Create, Read, Update, Delete)
// ===================================================================

// Adiciona um novo canal
async function adicionarCanal(nome, youtubeId) {
    try {
        // Para gerar um ID sequencial, primeiro lemos o último ID usado
        const ultimoCanalSnapshot = await db.collection('canais').orderBy('id', 'desc').limit(1).get();
        const novoId = ultimoCanalSnapshot.empty ? 1 : ultimoCanalSnapshot.docs[0].data().id + 1;

        await db.collection('canais').add({
            id: novoId,
            nome: nome,
            youtubeId: youtubeId,
            dataCriacao: new Date().toISOString().split('T')[0], // Formato AAAA-MM-DD
            status: 'Ativo'
        });
        console.log("Canal adicionado com sucesso!");
        renderizarDashboard(); // Re-renderiza a tabela
    } catch (error) {
        console.error("Erro ao adicionar canal: ", error);
    }
}

// Remove um canal
async function removerCanal(docId) {
    if (confirm("Tem certeza que deseja remover este canal do banco de dados?")) {
        try {
            await db.collection('canais').doc(docId).delete();
            console.log("Canal removido com sucesso!");
            renderizarDashboard();
        } catch (error) {
            console.error("Erro ao remover canal: ", error);
        }
    }
}

// Atualiza um canal existente
async function editarCanal(docId, nome, youtubeId) {
    try {
        await db.collection('canais').doc(docId).update({
            nome: nome,
            youtubeId: youtubeId
        });
        console.log("Canal atualizado com sucesso!");
        renderizarDashboard();
    } catch (error) {
        console.error("Erro ao editar canal: ", error);
    }
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

    // Botão Adicionar Novo Canal
    document.getElementById('btn-add-channel').addEventListener('click', openAddChannelModal);

    // Botão Voltar ao Dashboard
    document.getElementById('btn-back-to-dashboard').addEventListener('click', () => navigateTo('dashboard'));

    // Submissão do formulário de canal (Adicionar/Editar)
    document.getElementById('channel-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const docId = document.getElementById('channel-id-input').value;
        const nome = document.getElementById('channel-name').value;
        const youtubeId = document.getElementById('channel-youtube-id').value;

        if (docId) { // Se tem docId, é edição
            editarCanal(docId, nome, youtubeId);
        } else { // Senão, é adição
            adicionarCanal(nome, youtubeId);
        }
        closeModal('channel-modal');
    });

    // Inicialização
    navigateTo('dashboard');
    renderizarDashboard(); // A primeira renderização agora é assíncrona
});
