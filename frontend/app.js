const API = 'https://vigia-precos.onrender.com/api/produtos';
const AUTH_API = 'https://vigia-precos.onrender.com/api/auth';

const listaProdutos = document.getElementById('listaProdutos');
const produtoForm = document.getElementById('produtoForm');
const mensagem = document.getElementById('mensagem');

const authView = document.getElementById('authView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const cadastroForm = document.getElementById('cadastroForm');
const authMensagem = document.getElementById('authMensagem');
const authTitulo = document.getElementById('authTitulo');
const authDescricao = document.getElementById('authDescricao');
const authAlternativa = document.getElementById('authAlternativa');
const alternarAuthBtn = document.getElementById('alternarAuthBtn');
const usuarioArea = document.getElementById('usuarioArea');
const nomeUsuario = document.getElementById('nomeUsuario');

let modoCadastro = false;

function formatarPreco(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function obterToken() {
    return sessionStorage.getItem('vigia_token');
}

function mostrarMensagemAuth(texto, tipo = 'erro') {
    authMensagem.textContent = texto;
    authMensagem.className = `auth-message ${tipo}`;
}

function alternarTelaAuth() {
    modoCadastro = !modoCadastro;
    loginForm.hidden = modoCadastro;
    cadastroForm.hidden = !modoCadastro;

    authTitulo.textContent = modoCadastro ? 'Crie sua conta' : 'Entre na sua conta';
    authDescricao.textContent = modoCadastro
        ? 'Cadastre-se para começar a monitorar preços.'
        : 'Acesse seus produtos monitorados.';
    authAlternativa.textContent = modoCadastro
        ? 'Já possui uma conta?'
        : 'Ainda não tem uma conta?';
    alternarAuthBtn.textContent = modoCadastro ? 'Fazer login' : 'Cadastre-se';
    mostrarMensagemAuth('');
}

alternarAuthBtn.addEventListener('click', alternarTelaAuth);

// Todas as chamadas autenticadas recebem o JWT automaticamente.
async function requisicao(url, opcoes = {}, autenticada = true) {
    const headers = { ...(opcoes.headers || {}) };
    const token = obterToken();

    if (autenticada && token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const resposta = await fetch(url, { ...opcoes, headers });

    let dados = {};
    try {
        dados = await resposta.json();
    } catch {
        dados = {};
    }

    if (!resposta.ok) {
        // Um token expirado/inválido encerra a sessão no frontend.
        if (autenticada && token && resposta.status === 401) {
            encerrarSessao();
        }
        throw new Error(dados.erro || 'Erro na requisição.');
    }

    return dados;
}

loginForm.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const botao = loginForm.querySelector('button[type="submit"]');
    botao.disabled = true;
    botao.textContent = 'Entrando...';

    try {
        const dados = await requisicao(`${AUTH_API}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: document.getElementById('loginEmail').value.trim(),
                senha: document.getElementById('loginSenha').value
            })
        }, false);

        sessionStorage.setItem('vigia_token', dados.token);
        sessionStorage.setItem('vigia_usuario', JSON.stringify(dados.usuario));
        loginForm.reset();
        abrirDashboard(dados.usuario);
    } catch (erro) {
        mostrarMensagemAuth(erro.message);
    } finally {
        botao.disabled = false;
        botao.textContent = 'Entrar';
    }
});

cadastroForm.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const botao = cadastroForm.querySelector('button[type="submit"]');
    botao.disabled = true;
    botao.textContent = 'Criando conta...';

    try {
        const dados = await requisicao(`${AUTH_API}/cadastro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: document.getElementById('cadastroNome').value.trim(),
                email: document.getElementById('cadastroEmail').value.trim(),
                senha: document.getElementById('cadastroSenha').value
            })
        }, false);

        cadastroForm.reset();
        alternarTelaAuth();
        mostrarMensagemAuth(
            dados.mensagem || 'Cadastro realizado! Confira seu e-mail para confirmar a conta.',
            'sucesso'
        );
    } catch (erro) {
        mostrarMensagemAuth(erro.message);
    } finally {
        botao.disabled = false;
        botao.textContent = 'Criar conta';
    }
});

function abrirDashboard(usuario) {
    authView.hidden = true;
    dashboardView.hidden = false;
    usuarioArea.hidden = false;
    nomeUsuario.textContent = usuario?.nome || 'Usuário';
    carregarProdutos();
}

function encerrarSessao() {
    sessionStorage.removeItem('vigia_token');
    sessionStorage.removeItem('vigia_usuario');

    dashboardView.hidden = true;
    authView.hidden = false;
    usuarioArea.hidden = true;
    modoCadastro = false;
    loginForm.hidden = false;
    cadastroForm.hidden = true;
    authTitulo.textContent = 'Entre na sua conta';
    authDescricao.textContent = 'Acesse seus produtos monitorados.';
    authAlternativa.textContent = 'Ainda não tem uma conta?';
    alternarAuthBtn.textContent = 'Cadastre-se';
    mostrarMensagemAuth('Sua sessão terminou. Entre novamente.', 'erro');
    listaProdutos.innerHTML = '';
}

document.getElementById('sairBtn').addEventListener('click', encerrarSessao);

// Buscar produtos do usuário conectado.
async function carregarProdutos() {
    if (!obterToken()) return;

    try {
        const produtos = await requisicao(API);

        document.getElementById('totalProdutos').textContent = produtos.length;
        document.getElementById('monitorando').textContent =
            produtos.filter(p => p.status === 'monitorando').length;
        document.getElementById('atingidos').textContent =
            produtos.filter(p => p.status === 'atingido').length;

        if (produtos.length === 0) {
            listaProdutos.innerHTML = '<p>Nenhum produto cadastrado.</p>';
            return;
        }

        listaProdutos.innerHTML = produtos.map(produto => `
            <div class="produto-card">
                <h3>${escaparHTML(produto.nome)}</h3>
                <span class="status ${escaparHTML(produto.status)}">
                    ${escaparHTML(produto.status)}
                </span>
                <p class="preco">${formatarPreco(produto.preco_atual)}</p>
                <p class="preco-alvo">
                    Preço desejado: ${formatarPreco(produto.preco_alvo)}
                </p>
                <p class="preco-alvo">Fake Store ID: ${escaparHTML(produto.fake_store_id)}</p>
                <div class="acoes">
                    <button class="btn-secondary" data-acao="simular" data-id="${produto.id}">
                        Simular preço
                    </button>
                    <button class="btn-primary" data-acao="verificar" data-id="${produto.id}">
                        Verificar agora
                    </button>
                    <button class="btn-secondary" data-acao="historico" data-id="${produto.id}">
                        Histórico
                    </button>
                </div>
                <div id="historico-${produto.id}"></div>
            </div>
        `).join('');
    } catch (erro) {
        listaProdutos.innerHTML = `<p>Não foi possível carregar os produtos: ${escaparHTML(erro.message)}</p>`;
    }
}

function escaparHTML(valor) {
    return String(valor).replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

// Cadastrar produto.
produtoForm.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const fakeStoreId = Number(document.getElementById('fakeStoreId').value);
    const precoAlvo = Number(document.getElementById('precoAlvo').value);

    try {
        await requisicao(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fakeStoreId, precoAlvo })
        });

        mensagem.textContent = 'Produto cadastrado com sucesso!';
        mensagem.style.color = 'green';
        produtoForm.reset();
        await carregarProdutos();
    } catch (erro) {
        mensagem.textContent = erro.message;
        mensagem.style.color = 'red';
    }
});

// Ações dos produtos.
listaProdutos.addEventListener('click', async (evento) => {
    const botao = evento.target.closest('button[data-acao]');
    if (!botao) return;

    const id = botao.dataset.id;
    const acao = botao.dataset.acao;

    try {
        if (acao === 'simular') {
            const preco = prompt('Digite o novo preço:');
            if (preco === null) return;

            const valor = Number(preco.replace(',', '.'));
            if (!Number.isFinite(valor) || valor <= 0) {
                throw new Error('Digite um preço válido.');
            }

            await requisicao(`${API}/${id}/preco-simulado`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ preco: valor })
            });

            alert('Preço atualizado com sucesso!');
            await carregarProdutos();
        }

        if (acao === 'verificar') {
            const resultado = await requisicao(`${API}/${id}/verificar`, {
                method: 'POST'
            });

            alert(resultado.atingido
                ? 'Preço-alvo atingido!'
                : 'O preço ainda está acima do desejado.');

            await carregarProdutos();
        }

        if (acao === 'historico') {
            const dados = await requisicao(`${API}/${id}/historico`);
            const elemento = document.getElementById(`historico-${id}`);

            if (!dados.historico || dados.historico.length === 0) {
                elemento.innerHTML = '<p class="historico">Sem registros.</p>';
                return;
            }

            elemento.innerHTML = `
                <div class="historico">
                    <strong>Histórico de preços</strong>
                    ${dados.historico.map(registro => `
                        <p>
                            ${formatarPreco(registro.preco)}
                            — ${new Date(registro.data).toLocaleString('pt-BR')}
                        </p>
                    `).join('')}
                </div>
            `;
        }
    } catch (erro) {
        alert(erro.message);
    }
});

document.getElementById('atualizarBtn')
    .addEventListener('click', carregarProdutos);

// Restaura a sessão enquanto a aba continuar aberta.
function iniciarAplicacao() {
    const token = obterToken();
    const usuarioSalvo = sessionStorage.getItem('vigia_usuario');

    if (token && usuarioSalvo) {
        try {
            abrirDashboard(JSON.parse(usuarioSalvo));
        } catch {
            encerrarSessao();
        }
    } else {
        encerrarSessao();
        authMensagem.textContent = '';
    }
}

iniciarAplicacao();

setInterval(() => {
    if (obterToken() && !dashboardView.hidden) {
        carregarProdutos();
    }
}, 30000);
