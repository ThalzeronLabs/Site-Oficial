/* ==========================================================================
   Certame · Documentos legais — legal.js · versão 1.0 (29/09/2026)

   Sem biblioteca e sem rede. A página funciona e se lê sem este arquivo;
   ele só melhora:
   1. o tema: o botão cicla sistema → claro → escuro e guarda a escolha
      (localStorage, sempre em try/catch); ?tema=claro|escuro|sistema na URL
      força o tema sem guardar (para capturas);
   2. a aba do documento atual (pelo body[data-pagina]);
   3. o índice: o número de cada seção, a seção visível destacada
      (IntersectionObserver) e, no celular, o índice recolhível;
   4. a barra de leitura (.progresso) e o botão "voltar ao topo";
   5. no celular, o topo se esconde ao descer e volta ao subir;
   6. as tabelas que rolam de lado ficam focáveis pelo teclado;
   7. na impressão, a URL completa de cada link;
   8. o contador de [CONFERIR] (só aparece enquanto houver algum).
   ========================================================================== */
(function () {
  'use strict';

  var d = document;
  var raiz = d.documentElement;
  var corpo = d.body;
  if (!corpo || !d.querySelector) return;
  raiz.classList.add('js');

  function todos(seletor, base) {
    return Array.prototype.slice.call((base || d).querySelectorAll(seletor));
  }
  function consulta(q) {
    if (window.matchMedia) return window.matchMedia(q);
    return { matches: false };
  }
  function aoMudar(mq, fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn);
    else if (mq.addListener) mq.addListener(fn);
  }
  function adiar(fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  var reduzir = consulta('(prefers-reduced-motion: reduce)');
  var largo = consulta('(min-width: 1024px)');
  var sistemaEscuro = consulta('(prefers-color-scheme: dark)');

  /* ------------------------------------------------------------------
     1. O tema
     ------------------------------------------------------------------ */
  var CHAVE = 'certame-legal-tema';
  var ESTADOS = ['sistema', 'claro', 'escuro'];
  var NOMES = { sistema: 'Sistema', claro: 'Claro', escuro: 'Escuro' };
  var COMO = { sistema: 'segue o aparelho', claro: 'sempre claro', escuro: 'sempre escuro' };

  function lerTema() {
    try { return window.localStorage.getItem(CHAVE); } catch (e) { return null; }
  }
  function guardarTema(valor) {
    try {
      if (valor === 'sistema') window.localStorage.removeItem(CHAVE);
      else window.localStorage.setItem(CHAVE, valor);
    } catch (e) { /* sem armazenamento: o tema vale só nesta visita */ }
  }

  var pedidoNaUrl = null;
  try { pedidoNaUrl = new URLSearchParams(window.location.search).get('tema'); } catch (e) { /* navegador antigo */ }
  var tema = ESTADOS.indexOf(pedidoNaUrl) >= 0 ? pedidoNaUrl : lerTema();
  if (ESTADOS.indexOf(tema) < 0) tema = 'sistema';

  var corDoNavegador = d.querySelector('meta[name="theme-color"]');
  if (!corDoNavegador && d.head) {
    corDoNavegador = d.createElement('meta');
    corDoNavegador.setAttribute('name', 'theme-color');
    d.head.appendChild(corDoNavegador);
  }

  var botoesTema = todos('[data-tema-botao]');
  botoesTema.forEach(function (botao) {
    botao.textContent = '';
    var icone = d.createElement('span');
    icone.className = 'tema-icone';
    icone.setAttribute('aria-hidden', 'true');
    var rotulo = d.createElement('span');
    rotulo.className = 'tema-rotulo';
    botao.appendChild(icone);
    botao.appendChild(rotulo);
    botao.addEventListener('click', function () {
      var proximo = ESTADOS[(ESTADOS.indexOf(tema) + 1) % ESTADOS.length];
      aplicarTema(proximo, true);
      guardarTema(proximo);
    });
  });

  var relogioTema;
  function aplicarTema(novo, animar) {
    tema = novo;
    if (animar && !reduzir.matches) {
      raiz.classList.add('tema-transicao');
      clearTimeout(relogioTema);
      relogioTema = setTimeout(function () { raiz.classList.remove('tema-transicao'); }, 450);
    }
    if (novo === 'sistema') raiz.removeAttribute('data-tema');
    else raiz.setAttribute('data-tema', novo);
    var escuro = novo === 'escuro' || (novo === 'sistema' && sistemaEscuro.matches);
    if (corDoNavegador) corDoNavegador.setAttribute('content', escuro ? '#000000' : '#F5F6F5');

    var proximo = ESTADOS[(ESTADOS.indexOf(novo) + 1) % ESTADOS.length];
    var frase = 'Tema: ' + NOMES[novo].toLowerCase() + ' (' + COMO[novo] + '). Tocar para usar o ' +
      NOMES[proximo].toLowerCase() + '.';
    botoesTema.forEach(function (botao) {
      botao.setAttribute('data-estado', novo);
      botao.setAttribute('aria-label', frase);
      botao.setAttribute('title', frase);
      var rotulo = botao.querySelector('.tema-rotulo');
      if (rotulo) rotulo.textContent = NOMES[novo];
      /* troca o ícone por um novo para a animação de giro rodar de novo */
      var velho = botao.querySelector('.tema-icone');
      if (velho && animar) {
        var novoIcone = velho.cloneNode(false);
        velho.parentNode.replaceChild(novoIcone, velho);
      }
    });
  }
  aplicarTema(tema, false);
  aoMudar(sistemaEscuro, function () { if (tema === 'sistema') aplicarTema('sistema', false); });

  /* ------------------------------------------------------------------
     2. A aba do documento atual (o CSS já destaca sem JS; aqui vai o aria-current)
     ------------------------------------------------------------------ */
  var pagina = corpo.getAttribute('data-pagina') || '';
  todos('.abas a[href], .rodape-links a[href]').forEach(function (a) {
    var nome = (a.getAttribute('href') || '').split(/[?#]/)[0].replace(/^.*\//, '').replace(/\.html?$/i, '');
    if (nome && nome === pagina) a.setAttribute('aria-current', 'page');
  });
  var abas = d.querySelector('.abas');
  function centralizarAba() {
    var atual = abas && abas.querySelector('[aria-current="page"]');
    if (atual && abas.scrollWidth > abas.clientWidth + 1) {
      abas.scrollLeft = atual.offsetLeft - (abas.clientWidth - atual.offsetWidth) / 2;
    }
  }
  centralizarAba();

  /* ------------------------------------------------------------------
     3. A altura do topo (para o índice fixo e o observador)
     ------------------------------------------------------------------ */
  var topo = d.querySelector('.topo');
  function alturaTopo() { return topo ? topo.offsetHeight : 0; }
  function medirTopo() { if (topo) raiz.style.setProperty('--topo-h', alturaTopo() + 'px'); }
  medirTopo();

  /* ------------------------------------------------------------------
     4. Os números das subseções ("3.1 Título" → o número ganha cor)
     ------------------------------------------------------------------ */
  todos('.secao h3').forEach(function (h) {
    var primeiro = h.firstChild;
    if (!primeiro || primeiro.nodeType !== 3) return;
    var m = /^\s*(\d+(?:\.\d+)+\.?)\s+/.exec(primeiro.nodeValue);
    if (!m) return;
    var numero = d.createElement('span');
    numero.className = 'num-sub';
    numero.textContent = m[1];
    primeiro.nodeValue = primeiro.nodeValue.slice(m[0].length);
    h.insertBefore(numero, primeiro);
    h.insertBefore(d.createTextNode(' '), primeiro);
  });

  /* ------------------------------------------------------------------
     5. O índice: números, seção atual e, no celular, recolher/abrir
     ------------------------------------------------------------------ */
  var indice = d.querySelector('.indice');
  var ligacoes = [];
  var alvos = [];
  var textoAtual = null;
  var botaoIndice = null;
  var ativo = null;

  function abrirIndice(abrir) {
    if (!indice || !botaoIndice) return;
    indice.classList.toggle('recolhido', !abrir);
    botaoIndice.setAttribute('aria-expanded', abrir ? 'true' : 'false');
  }

  if (indice) {
    todos('a[href^="#"]', indice).forEach(function (a) {
      var id = '';
      try { id = decodeURIComponent(a.getAttribute('href').slice(1)); } catch (e) { id = a.getAttribute('href').slice(1); }
      var alvo = id ? d.getElementById(id) : null;
      if (!alvo) return;
      ligacoes.push(a);
      alvos.push(alvo);
      var num = alvo.querySelector('h2 .num');
      if (num && !a.querySelector('.indice-num')) {
        var n = d.createElement('span');
        n.className = 'indice-num';
        n.textContent = num.textContent.trim();
        a.insertBefore(n, a.firstChild);
        a.insertBefore(d.createTextNode(' '), n.nextSibling);
      }
    });

    var titulo = indice.querySelector('h2');
    var lista = indice.querySelector('ol, ul');
    if (titulo && lista) {
      if (!lista.id) lista.id = 'indice-lista';
      var nomeIndice = titulo.textContent.trim() || 'Índice';
      titulo.textContent = '';
      var rotulo = d.createElement('span');
      rotulo.className = 'indice-rotulo';
      rotulo.textContent = nomeIndice;
      botaoIndice = d.createElement('button');
      botaoIndice.type = 'button';
      botaoIndice.className = 'indice-botao';
      botaoIndice.setAttribute('aria-controls', lista.id);
      var tituloBotao = d.createElement('span');
      tituloBotao.className = 'indice-botao-titulo';
      tituloBotao.textContent = nomeIndice;
      textoAtual = d.createElement('span');
      textoAtual.className = 'indice-atual';
      textoAtual.textContent = ligacoes.length + (ligacoes.length === 1 ? ' seção' : ' seções');
      var seta = d.createElement('span');
      seta.className = 'indice-seta';
      seta.setAttribute('aria-hidden', 'true');
      botaoIndice.appendChild(tituloBotao);
      botaoIndice.appendChild(textoAtual);
      botaoIndice.appendChild(seta);
      titulo.appendChild(rotulo);
      titulo.appendChild(botaoIndice);
      abrirIndice(false);

      botaoIndice.addEventListener('click', function () {
        abrirIndice(indice.classList.contains('recolhido'));
      });
      /* no celular, escolher uma seção fecha o índice ANTES de rolar (o destino não pula) */
      lista.addEventListener('click', function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a') : null;
        if (a && !largo.matches) abrirIndice(false);
      });
      d.addEventListener('keydown', function (e) {
        if ((e.key === 'Escape' || e.key === 'Esc') && !largo.matches && !indice.classList.contains('recolhido')) {
          abrirIndice(false);
          botaoIndice.focus();
        }
      });
    }
  }

  function marcar(alvo) {
    if (alvo === ativo) return;
    ativo = alvo;
    var escolhida = null;
    ligacoes.forEach(function (a, i) {
      if (alvos[i] === alvo) { a.setAttribute('aria-current', 'true'); escolhida = a; }
      else a.removeAttribute('aria-current');
    });
    if (textoAtual) {
      textoAtual.textContent = escolhida
        ? escolhida.textContent.replace(/\s+/g, ' ').trim()
        : ligacoes.length + (ligacoes.length === 1 ? ' seção' : ' seções');
    }
    /* no desktop, o item ativo nunca fica escondido na coluna do índice */
    if (escolhida && largo.matches && indice && indice.scrollHeight > indice.clientHeight) {
      var topoItem = escolhida.offsetTop;
      if (topoItem < indice.scrollTop + 40 || topoItem + escolhida.offsetHeight > indice.scrollTop + indice.clientHeight - 40) {
        indice.scrollTop = topoItem - indice.clientHeight / 3;
      }
    }
  }

  var visiveis = [];
  var observador = null;
  function fimDaPagina() {
    return window.innerHeight + (window.pageYOffset || raiz.scrollTop) >= raiz.scrollHeight - 4;
  }
  function escolherAtivo() {
    if (!alvos.length) return;
    if (fimDaPagina() && visiveis.length) { marcar(alvos[alvos.length - 1]); return; }
    var melhor = null;
    for (var i = 0; i < alvos.length; i++) if (visiveis.indexOf(alvos[i]) >= 0) melhor = alvos[i];
    if (melhor) { marcar(melhor); return; }
    /* acima da primeira seção: nenhuma ativa */
    var primeiro = alvos[0].getBoundingClientRect();
    if (primeiro.top > window.innerHeight * 0.4) marcar(null);
  }
  function observar() {
    if (!('IntersectionObserver' in window) || !alvos.length) return;
    if (observador) observador.disconnect();
    visiveis = [];
    /* a faixa de leitura: logo abaixo do topo até 38% da altura da tela */
    observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        var i = visiveis.indexOf(e.target);
        if (e.isIntersecting && i < 0) visiveis.push(e.target);
        else if (!e.isIntersecting && i >= 0) visiveis.splice(i, 1);
      });
      escolherAtivo();
    }, { rootMargin: '-' + (alturaTopo() + 8) + 'px 0px -62% 0px', threshold: 0 });
    alvos.forEach(function (alvo) { observador.observe(alvo); });
  }
  observar();

  /* ------------------------------------------------------------------
     6. O "voltar ao topo" e o contador de [CONFERIR]
     ------------------------------------------------------------------ */
  var voltar = d.createElement('button');
  voltar.type = 'button';
  voltar.className = 'voltar-topo';
  voltar.setAttribute('aria-label', 'Voltar ao topo');
  voltar.setAttribute('title', 'Voltar ao topo');
  voltar.addEventListener('click', function () {
    try { window.scrollTo({ top: 0, behavior: reduzir.matches ? 'auto' : 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
    var marca = d.querySelector('.marca');
    if (marca) { try { marca.focus({ preventScroll: true }); } catch (e) { /* sem preventScroll */ } }
  });
  corpo.appendChild(voltar);

  var pendencias = todos('.conferir');
  if (pendencias.length) {
    var contador = d.createElement('button');
    contador.type = 'button';
    contador.className = 'conferir-contador';
    var total = pendencias.length;
    var resumoPendencias = total + (total === 1 ? ' ponto a conferir' : ' pontos a conferir');
    contador.textContent = resumoPendencias;
    contador.setAttribute('title', 'Ir ao próximo [CONFERIR] (para o revisor)');
    var posicao = -1;
    contador.addEventListener('click', function () {
      posicao = (posicao + 1) % total;
      var alvo = pendencias[posicao];
      if (indice && !largo.matches && indice.contains(alvo)) abrirIndice(true);
      try { alvo.scrollIntoView({ behavior: reduzir.matches ? 'auto' : 'smooth', block: 'center' }); } catch (e) { alvo.scrollIntoView(); }
      pendencias.forEach(function (p) { p.classList.remove('conferir-foco'); });
      void alvo.offsetWidth; /* reinicia a animação */
      alvo.classList.add('conferir-foco');
      contador.textContent = (posicao + 1) + ' de ' + total + ' a conferir';
    });
    corpo.appendChild(contador);
  }

  /* ------------------------------------------------------------------
     7. A rolagem: a barra de leitura, o anel do botão e o topo que se esconde
     ------------------------------------------------------------------ */
  var barra = d.querySelector('.progresso');
  var ultimoY = window.pageYOffset || 0;
  var agendado = false;

  function aoRolar() {
    agendado = false;
    var y = window.pageYOffset || raiz.scrollTop || 0;
    var maximo = raiz.scrollHeight - window.innerHeight;
    var lido = maximo > 0 ? Math.min(1, Math.max(0, y / maximo)) : 0;
    var valor = lido.toFixed(4);
    if (barra) barra.style.setProperty('--lido', valor);
    voltar.style.setProperty('--lido', valor);
    var mostrar = y > window.innerHeight * 0.9;
    if (mostrar !== voltar.classList.contains('visivel')) voltar.classList.toggle('visivel', mostrar);

    if (topo) {
      topo.classList.toggle('rolou', y > 8);
      var focoNoTopo = topo.contains(d.activeElement);
      if (largo.matches || focoNoTopo || y < alturaTopo() * 2) {
        topo.classList.remove('topo-oculto');
        ultimoY = y;
      } else {
        var delta = y - ultimoY;
        if (delta > 6) { topo.classList.add('topo-oculto'); ultimoY = y; }
        else if (delta < -6) { topo.classList.remove('topo-oculto'); ultimoY = y; }
      }
    }
    escolherAtivo();
  }
  function pedirQuadro() {
    if (agendado) return;
    agendado = true;
    (window.requestAnimationFrame || function (f) { return setTimeout(f, 16); })(aoRolar);
  }
  window.addEventListener('scroll', pedirQuadro, { passive: true });
  if (topo) topo.addEventListener('focusin', function () { topo.classList.remove('topo-oculto'); });

  /* ------------------------------------------------------------------
     8. As tabelas que rolam de lado ficam focáveis (teclado) e nomeadas
     ------------------------------------------------------------------ */
  function revisarTabelas() {
    todos('.tabela').forEach(function (t) {
      var rola = t.scrollWidth > t.clientWidth + 1;
      t.classList.toggle('rola', rola);
      if (rola) {
        t.setAttribute('tabindex', '0');
        t.setAttribute('role', 'region');
        if (!t.hasAttribute('aria-label') || t.hasAttribute('data-rotulo-js')) {
          var legenda = t.querySelector('caption');
          t.setAttribute('aria-label', (legenda ? legenda.textContent.trim() + '. ' : '') + 'Tabela: role para o lado para ver tudo');
          t.setAttribute('data-rotulo-js', '');
        }
      } else if (t.hasAttribute('data-rotulo-js')) {
        t.removeAttribute('tabindex');
        t.removeAttribute('role');
        t.removeAttribute('aria-label');
        t.removeAttribute('data-rotulo-js');
      }
    });
  }
  revisarTabelas();

  /* ------------------------------------------------------------------
     9. Na impressão, a URL completa de cada link
     ------------------------------------------------------------------ */
  todos('a[href]').forEach(function (a) {
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#') return;
    var texto = (a.textContent || '').replace(/\s+/g, ' ').trim();
    if (/^mailto:/i.test(href)) {
      var endereco = href.replace(/^mailto:/i, '').split('?')[0];
      if (texto === endereco) a.classList.add('url-visivel');
      else a.setAttribute('data-url', endereco);
      return;
    }
    if (texto === href || texto === a.href) a.classList.add('url-visivel');
    else a.setAttribute('data-url', a.href);
  });

  /* ------------------------------------------------------------------
     10. Ao mudar o tamanho da tela ou a largura (celular ↔ desktop)
     ------------------------------------------------------------------ */
  var ajustar = adiar(function () {
    medirTopo();
    observar();
    revisarTabelas();
    centralizarAba();
    aoRolar();
  }, 150);
  window.addEventListener('resize', ajustar);
  aoMudar(largo, function () {
    if (largo.matches) { if (botaoIndice) indice.classList.remove('recolhido'); }
    else abrirIndice(false);
    if (topo) topo.classList.remove('topo-oculto');
    ajustar();
  });
  if ('ResizeObserver' in window && topo) {
    new ResizeObserver(function () { medirTopo(); }).observe(topo);
  }
  aoRolar();
})();
