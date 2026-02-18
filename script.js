/**
 * CONFIGURAÇÃO DO SUPABASE
 */
const SUPABASE_URL = 'https://gbylbeqlfzwisuclncko.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieWxiZXFsZnp3aXN1Y2xuY2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2Nzg1MTksImV4cCI6MjA4NjI1NDUxOX0.gc6Kto6ceGhHyW9WrMABCQNVdHp0I7f3ndSFxco1UXU'; // Use a sua chave anon original
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let lancamentos = [];
let carrinho = [];

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    // Configura data padrão
    const dataInput = document.getElementById('data_entrega');
    if (dataInput) dataInput.valueAsDate = new Date();

    // Inicia fluxo de autenticação
    verificarSessao();
});

// --- COMUNICAÇÃO COM O BANCO ---

async function buscarDadosDoSupabase() {
    try {
        const { data, error } = await _supabase
            .from('movimentacoes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        lancamentos = data;
        renderizarTabela();
    } catch (err) {
        console.error("Erro ao carregar dados:", err.message);
        // Se der erro de coluna não encontrada, o problema é no SQL Editor
        if (err.message.includes("registrado_por")) {
            alert("Atenção: A coluna 'registrado_por' não foi encontrada no banco. Rode a query no SQL Editor.");
        }
    }
}

async function confirmarTudo() {
    if (carrinho.length === 0) return alert("A lista está vazia!");

    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return alert("Sessão expirada. Faça login novamente.");

    const dadosParaEnviar = carrinho.map(item => ({
        ...item,
        registrado_por: user.email
    }));

    const { error } = await _supabase.from('movimentacoes').insert(dadosParaEnviar);

    if (error) {
        alert("Erro ao salvar: " + error.message);
    } else {
        alert("Sucesso!");
        carrinho = [];
        renderizarCarrinho();
        document.getElementById('uniforme-form').reset();
        buscarDadosDoSupabase();
    }
}

// --- RENDERIZAÇÃO ---

function renderizarTabela() {
    const corpo = document.getElementById('corpo-estoque');
    if (!corpo) return;

    if (lancamentos.length === 0) {
        corpo.innerHTML = `<tr><td colspan="9" style="text-align:center;">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    corpo.innerHTML = lancamentos.map(i => {
        const dataFormatada = i.data ? i.data.split('-').reverse().join('/') : '-';
        const corAcao = i.acao === 'Saída' ? '#d9534f' : '#5cb85c';

        // Proteção para não quebrar a tabela se o campo for nulo
        const responsavel = i.registrado_por || 'Antigo';

        return `
        <tr>
            <td>${dataFormatada}</td>
            <td>${i.colaborador || '-'}</td>
            <td>${i.descricao_item || '-'}</td>
            <td style="color: ${corAcao}; font-weight:bold;">${i.acao || '-'}</td>
            <td>${i.tipo || '-'}</td>
            <td>${i.tamanho || '-'}</td>
            <td>${i.condicao || '-'}</td>
            <td><strong>${i.qtd || 0}</strong></td>
            <td style="font-size:0.7rem; color:gray;">${responsavel}</td>
        </tr>
        `;
    }).join('');
}

// --- AUTENTICAÇÃO ---

async function realizarLogin() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-senha').value;
    const btn = document.getElementById('btn-login');

    btn.innerText = "Verificando...";

    const { error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alert("Erro no login: " + error.message);
        btn.innerText = "Entrar";
    } else {
        document.getElementById('auth-overlay').style.display = 'none';
        buscarDadosDoSupabase();
    }
}

async function verificarSessao() {
    const { data: { session } } = await _supabase.auth.getSession();
    const overlay = document.getElementById('auth-overlay');

    if (session) {
        overlay.style.display = 'none';
        buscarDadosDoSupabase();
    } else {
        overlay.style.display = 'flex';
    }
}

async function deslogar() {
    await _supabase.auth.signOut();
    window.location.reload();
}

// Funções de Interface (ajustarFluxo, atualizarTamanhos, etc) devem ser mantidas abaixo...
function ajustarFluxo() {
    const val = document.getElementById('solicitacao').value;
    const campos = document.getElementById('campos-dinamicos');
    val !== "" ? campos.classList.remove('hidden') : campos.classList.add('hidden');
}

function verificarOutraDescricao() {
    const select = document.getElementById('descricao_item');
    const inputOutra = document.getElementById('outra_descricao');
    if (select.value === 'OUTRA') {
        inputOutra.classList.remove('hidden');
        inputOutra.focus();
    } else {
        inputOutra.classList.add('hidden');
        inputOutra.value = '';
    }
}

function atualizarTamanhos() {
    const tipo = document.querySelector('input[name="tipo"]:checked')?.value;
    const container = document.getElementById('tamanho-container');
    container.innerHTML = '';
    let lista = (tipo === 'Bota') ?
        Array.from({ length: 17 }, (_, i) => (i + 34).toString()) :
        ['P', 'M', 'G', 'GG', 'XG', 'XGG'];

    lista.forEach(t => {
        container.innerHTML += `<input type="radio" name="tamanho" id="tam_${t}" value="${t}"><label for="tam_${t}">${t}</label>`;
    });
}

function adicionarAoCarrinho() {
    const tipo = document.querySelector('input[name="tipo"]:checked')?.value;
    const tamanho = document.querySelector('input[name="tamanho"]:checked')?.value;
    const condicao = document.querySelector('input[name="condicao"]:checked')?.value;
    const qtd = parseInt(document.getElementById('quantidade').value);
    const data = document.getElementById('data_entrega').value;
    const acao = document.getElementById('solicitacao').value;
    const selectDesc = document.getElementById('descricao_item').value;
    const inputOutra = document.getElementById('outra_descricao').value.toUpperCase();
    const descricaoFinal = (selectDesc === 'OUTRA') ? inputOutra : selectDesc;
    const colaborador = document.getElementById('colaborador').value.toUpperCase() || "NÃO INFORMADO";
    const observacao = document.getElementById('observacao').value.toUpperCase();

    if (!tipo || !tamanho || isNaN(qtd) || !descricaoFinal) return alert("Preencha tudo!");

    carrinho.push({ data, colaborador, descricao_item: descricaoFinal, acao, tipo, tamanho, condicao, qtd, observacao });
    renderizarCarrinho();
    limparCamposItem();
}

function renderizarCarrinho() {
    const container = document.getElementById('carrinho');
    const lista = document.getElementById('lista-carrinho');
    if (carrinho.length > 0) {
        container.classList.remove('hidden');
        lista.innerHTML = carrinho.map((item, index) => `<div class="item-card"><div><strong>${item.qtd}x ${item.tipo}</strong></div><span class="btn-remove" onclick="removerDoCarrinho(${index})">&times;</span></div>`).join('');
    } else { container.classList.add('hidden'); }
}

function removerDoCarrinho(index) { carrinho.splice(index, 1); renderizarCarrinho(); }

function limparCamposItem() {
    document.querySelectorAll('input[name="tipo"], input[name="tamanho"]').forEach(i => i.checked = false);
    document.getElementById('quantidade').value = 1;
}

function exportarExcel() {
    if (lancamentos.length === 0) return alert("Vazio!");
    let csv = "\ufeffData;Colaborador;Descrição;Ação;Item;Tamanho;Condição;Quantidade;Responsavel\n";
    lancamentos.forEach(i => {
        csv += `${i.data};${i.colaborador};${i.descricao_item};${i.acao};${i.tipo};${i.tamanho};${i.condicao};${i.qtd};${i.registrado_por || ''}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "historico.csv";
    link.click();
}