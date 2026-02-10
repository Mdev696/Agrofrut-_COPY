/**
 * CONFIGURAÇÃO DO SUPABASE
 * Conectado ao projeto: gbylbeqlfzwisuclncko
 */
const SUPABASE_URL = 'https://gbylbeqlfzwisuclncko.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieWxiZXFsZnp3aXN1Y2xuY2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2Nzg1MTksImV4cCI6MjA4NjI1NDUxOX0.gc6Kto6ceGhHyW9WrMABCQNVdHp0I7f3ndSFxco1UXU';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variáveis Globais
let lancamentos = [];
let carrinho = [];

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    const dataInput = document.getElementById('data_entrega');
    if (dataInput) dataInput.valueAsDate = new Date();

    buscarDadosDoSupabase();
});

// --- COMUNICAÇÃO COM O BANCO (SUPABASE) ---

async function buscarDadosDoSupabase() {
    const { data, error } = await _supabase
        .from('movimentacoes')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Erro ao buscar dados:", error.message);
    } else {
        lancamentos = data;
        renderizarTabela();
    }
}

async function confirmarTudo() {
    if (carrinho.length === 0) return alert("A lista de itens está vazia!");

    const { data, error } = await _supabase
        .from('movimentacoes')
        .insert(carrinho);

    if (error) {
        alert("Erro ao salvar no banco: " + error.message);
    } else {
        alert("Registro finalizado com sucesso no Supabase!");
        carrinho = [];
        renderizarCarrinho();
        document.getElementById('uniforme-form').reset();
        document.getElementById('data_entrega').valueAsDate = new Date();
        ajustarFluxo();
        buscarDadosDoSupabase();
    }
}

// --- LÓGICA DA INTERFACE (UI) ---

function ajustarFluxo() {
    const val = document.getElementById('solicitacao').value;
    const campos = document.getElementById('campos-dinamicos');
    val !== "" ? campos.classList.remove('hidden') : campos.classList.add('hidden');
}

// FUNÇÃO PARA CAMPO "OUTRA" DESCRIÇÃO
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

    let lista = [];

    if (tipo === 'Bota') {
        for (let i = 34; i <= 50; i++) {
            lista.push(i.toString());
        }
    } else {
        lista = ['P', 'M', 'G', 'GG', 'XG', 'XGG'];
    }

    lista.forEach(t => {
        container.innerHTML += `
            <input type="radio" name="tamanho" id="tam_${t}" value="${t}">
            <label for="tam_${t}">${t}</label>
        `;
    });
}

function adicionarAoCarrinho() {
    const tipo = document.querySelector('input[name="tipo"]:checked')?.value;
    const tamanho = document.querySelector('input[name="tamanho"]:checked')?.value;
    const condicao = document.querySelector('input[name="condicao"]:checked')?.value;
    const qtd = parseInt(document.getElementById('quantidade').value);
    const data = document.getElementById('data_entrega').value;
    const acao = document.getElementById('solicitacao').value;

    // Lógica para capturar a descrição correta (Select ou Input)
    const selectDesc = document.getElementById('descricao_item').value;
    const inputOutra = document.getElementById('outra_descricao').value.toUpperCase();
    const descricaoFinal = (selectDesc === 'OUTRA') ? inputOutra : selectDesc;

    const colaborador = document.getElementById('colaborador').value.toUpperCase() || "NÃO INFORMADO";
    const observacao = document.getElementById('observacao').value.toUpperCase();

    if (!tipo || !tamanho || isNaN(qtd) || !descricaoFinal) {
        return alert("Por favor, preencha todos os campos (Item, Tamanho, Descrição e Quantidade)!");
    }

    carrinho.push({
        data,
        colaborador,
        descricao_item: descricaoFinal,
        acao,
        tipo,
        tamanho,
        condicao,
        qtd,
        observacao
    });

    renderizarCarrinho();
    limparCamposItem();
}

function limparCamposItem() {
    document.querySelectorAll('input[name="tipo"], input[name="tamanho"]').forEach(i => i.checked = false);
    document.getElementById('tamanho-container').innerHTML = '<small style="opacity: 0.5;">Aguardando item...</small>';
    document.getElementById('quantidade').value = 1;
    document.getElementById('observacao').value = '';

    // Reseta o Select e esconde o campo "Outra"
    document.getElementById('descricao_item').value = '';
    document.getElementById('outra_descricao').classList.add('hidden');
    document.getElementById('outra_descricao').value = '';
}

// --- RENDERIZAÇÃO ---

function renderizarCarrinho() {
    const container = document.getElementById('carrinho');
    const lista = document.getElementById('lista-carrinho');

    if (carrinho.length > 0) {
        container.classList.remove('hidden');
        lista.innerHTML = carrinho.map((item, index) => `
            <div class="item-card">
                <div>
                    <strong>${item.qtd}x ${item.tipo} (${item.tamanho})</strong><br>
                    <small>${item.acao} | ${item.colaborador}</small><br>
                    <small style="color: #b3d1a8">${item.descricao_item}</small>
                </div>
                <span class="btn-remove" onclick="removerDoCarrinho(${index})">&times;</span>
            </div>
        `).join('');
    } else {
        container.classList.add('hidden');
    }
}

function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    renderizarCarrinho();
}

function renderizarTabela() {
    const corpo = document.getElementById('corpo-estoque');
    if (!corpo) return;

    corpo.innerHTML = lancamentos.map(i => {
        const dataFormatada = i.data.split('-').reverse().join('/');
        const corAcao = i.acao === 'Saída' ? '#d9534f' : '#5cb85c';

        return `
        <tr>
            <td>${dataFormatada}</td>
            <td>${i.colaborador}</td>
            <td>${i.descricao_item || '-'}</td>
            <td style="color: ${corAcao}; font-weight:bold;">${i.acao}</td>
            <td>${i.tipo}</td>
            <td>${i.tamanho}</td>
            <td>${i.condicao}</td>
            <td><strong>${i.qtd}</strong></td>
        </tr>
        `;
    }).join('');
}

// --- UTILITÁRIOS ---

function exportarExcel() {
    if (lancamentos.length === 0) return alert("Não há dados para exportar!");

    let csv = "\ufeffData;Colaborador;Descrição;Ação;Item;Tamanho;Condição;Quantidade\n";
    lancamentos.forEach(i => {
        csv += `${i.data};${i.colaborador};${i.descricao_item || ''};${i.acao};${i.tipo};${i.tamanho};${i.condicao};${i.qtd}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "historico_uniformes_agrofruti.csv";
    link.click();
}