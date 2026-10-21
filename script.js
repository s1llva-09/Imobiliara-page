document.getElementById('whatsappForm').addEventListener('submit', function(e) {
    e.preventDefault(); // Impide la recarga de la página

    // Configurações
    const seuNumero = "5491127858950"; // COLOQUE SU NÚMERO AQUÍ (con código de país y sin espacios)
    
    // Pega os valores dos campos
    const nome = document.getElementById('nome').value;
    const telefone = document.getElementById('telefone').value;
    const email = document.getElementById('email').value;
    const mensagem = document.getElementById('mensagem').value;

    // Monta o texto da mensagem
    const texto = `Hola, mi nombre es *${nome}*.\n` +
                  `Teléfono: ${telefone}\n` +
                  `Correo: ${email}\n\n` +
                  `*Mensaje:* ${mensagem}`;

    // Codifica para a URL
    const textoCodificado = encodeURIComponent(texto);

    // Cria o link do WhatsApp
    const linkZap = `https://wa.me/${seuNumero}?text=${textoCodificado}`;

    // Abre o WhatsApp em uma nova aba
    window.open(linkZap, '_blank');
});

const modal = document.getElementById('propertyModal');
const closeIcon = document.querySelector('.close');
const closeModalButton = document.querySelector('.close-modal');
const modalImg = document.getElementById('modalImg');
const modalImgContainer = document.querySelector('.modal-img-container');
const modalPrev = document.getElementById('modalPrev');
const modalNext = document.getElementById('modalNext');
const modalDots = document.getElementById('modalDots');
const imageLightbox = document.getElementById('imageLightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxClose = document.getElementById('lightboxClose');
const modalBedsValue = document.getElementById('modalBeds');
const modalBathsValue = document.getElementById('modalBaths');
const modalBedsLabel = document.getElementById('modalBedsLabel');
const modalBathsLabel = document.getElementById('modalBathsLabel');
let lockedScrollY = 0;
let closeModalTimer = null;
const MODAL_ANIMATION_MS = 240;
let modalGallery = [];
let modalGalleryIndex = 0;
let touchStartX = null;
let touchStartY = null;
let isLightboxOpen = false;
const preloadedModalImages = new Set();
const preloadedCardImages = new Set();
const mobileCardRotation = new Map();
let mobileCardObserver = null;
let mobileCardResizeTimer = null;
const mobileViewportQuery = window.matchMedia('(max-width: 900px)');

const looksMojibake = (value) => /Ã.|Â.|ð.|â.|ï.|�/.test(value);

const decodeMojibakeOnce = (value) => {
    const bytes = Uint8Array.from(Array.from(value, (char) => char.charCodeAt(0) & 0xff));
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
};

const fixMojibakeText = (value) => {
    if (typeof value !== 'string' || !looksMojibake(value)) return value;

    let current = value;

    for (let attempt = 0; attempt < 3 && looksMojibake(current); attempt += 1) {
        try {
            const decoded = decodeMojibakeOnce(current);
            if (!decoded || decoded === current) break;
            current = decoded;
        } catch (error) {
            break;
        }
    }

    return current;
};

const normalizeMojibakeInDom = (root = document) => {
    const scope = root.body || root;

    if (scope) {
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
        let textNode = walker.nextNode();

        while (textNode) {
            const original = textNode.nodeValue;
            const fixed = fixMojibakeText(original);
            if (fixed !== original) textNode.nodeValue = fixed;
            textNode = walker.nextNode();
        }
    }

    const attributeNames = ['aria-label', 'alt', 'placeholder', 'title'];
    const selector = '[aria-label],[alt],[placeholder],[title]';

    root.querySelectorAll(selector).forEach((el) => {
        attributeNames.forEach((attr) => {
            if (!el.hasAttribute(attr)) return;
            const original = el.getAttribute(attr);
            const fixed = fixMojibakeText(original);
            if (fixed !== original) el.setAttribute(attr, fixed);
        });
    });

    if (typeof document.title === 'string') {
        document.title = fixMojibakeText(document.title);
    }

    document.querySelectorAll('meta[content]').forEach((meta) => {
        const original = meta.getAttribute('content');
        const fixed = fixMojibakeText(original);
        if (fixed !== original) meta.setAttribute('content', fixed);
    });
};

const parseCount = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
};

const getCurrentSiteLang = () => {
    const htmlLang = (document.documentElement.lang || '').toLowerCase();
    return htmlLang.startsWith('pt') ? 'pt' : (htmlLang.startsWith('en') ? 'en' : 'es');
};

const updateModalFeatureLabels = (bedsCount, bathsCount, lang = getCurrentSiteLang()) => {
    const labels = {
        es: [['Habitación', 'Habitaciones'], ['Baño', 'Baños']],
        pt: [['Quarto', 'Quartos'], ['Banheiro', 'Banheiros']],
        en: [['Bedroom', 'Bedrooms'], ['Bathroom', 'Bathrooms']]
    }[lang] || [['Habitación', 'Habitaciones'], ['Baño', 'Baños']];
    if (modalBedsLabel) modalBedsLabel.textContent = bedsCount === 1 ? labels[0][0] : labels[0][1];
    if (modalBathsLabel) modalBathsLabel.textContent = bathsCount === 1 ? labels[1][0] : labels[1][1];
};

const openImageLightbox = () => {
    if (!imageLightbox || !lightboxImg || !modalGallery.length) return;
    lightboxImg.src = modalGallery[modalGalleryIndex];
    lightboxImg.alt = `Imagem ampliada ${modalGalleryIndex + 1} do imóvel`;
    imageLightbox.classList.add('is-open');
    imageLightbox.setAttribute('aria-hidden', 'false');
    isLightboxOpen = true;
};

const closeImageLightbox = () => {
    if (!imageLightbox) return;
    imageLightbox.classList.remove('is-open');
    imageLightbox.setAttribute('aria-hidden', 'true');
    isLightboxOpen = false;
};

const isMobileViewport = () => mobileViewportQuery.matches;

const getModalGallery = (button) => {
    const galleryRaw = (button.getAttribute('data-gallery') || '').trim();
    const gallery = galleryRaw
        .split('|')
        .map(img => img.trim())
        .filter(Boolean);

    if (!gallery.length) {
        const singleImage = (button.getAttribute('data-img') || '').trim();
        if (singleImage) gallery.push(singleImage);
    }

    return gallery;
};

const getCardGallery = (button) => {
    if (!button) return [];
    const galleryRaw = (button.getAttribute('data-gallery') || '').trim();
    const parsed = galleryRaw
        .split('|')
        .map((img) => img.trim())
        .filter(Boolean);

    if (parsed.length) return parsed;

    const fallback = (button.getAttribute('data-img') || '').trim();
    return fallback ? [fallback] : [];
};

const initPropertyGalleryIndicators = () => {
    document.querySelectorAll('.property-card').forEach((card) => {
        const header = card.querySelector('.property-header');
        const detailsButton = card.querySelector('.btn-outline');
        if (!header || !detailsButton) return;

        const gallery = getCardGallery(detailsButton);
        if (gallery.length <= 1) return;

        const oldIndicator = header.querySelector('.property-gallery-indicator');
        if (oldIndicator) oldIndicator.remove();

        const indicator = document.createElement('div');
        indicator.className = 'property-gallery-indicator';
        indicator.setAttribute('aria-hidden', 'true');

        const dotsCount = Math.min(gallery.length, 4);
        for (let i = 0; i < dotsCount; i += 1) {
            const dot = document.createElement('span');
            if (i === 0) dot.classList.add('active');
            indicator.appendChild(dot);
        }

        header.appendChild(indicator);
    });
};

const stopMobileCardInterval = (state) => {
    if (!state || !state.timer) return;
    window.clearInterval(state.timer);
    state.timer = null;
};

const preloadCardImage = (src) => {
    if (!src || preloadedCardImages.has(src)) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    preloadedCardImages.add(src);
};

const advanceMobileCardImage = (state, step = 1) => {
    if (!state || state.images.length <= 1) return;
    const total = state.images.length;
    state.index = (state.index + step + total) % total;
    const currentSrc = state.images[state.index];
    if (currentSrc) state.cover.src = currentSrc;
    updateCardIndicator(state);

    const nextSrc = state.images[(state.index + 1) % total];
    preloadCardImage(nextSrc);
};

const startMobileCardInterval = (state) => {
    if (!state || state.timer || state.images.length <= 1) return;
    preloadCardImage(state.images[(state.index + 1) % state.images.length]);
    state.timer = window.setInterval(() => {
        advanceMobileCardImage(state, 1);
    }, 3400);
};

const stopAllMobileCardRotation = (resetToCover = false) => {
    if (mobileCardObserver) {
        mobileCardObserver.disconnect();
        mobileCardObserver = null;
    }

    mobileCardRotation.forEach((state) => {
        stopMobileCardInterval(state);
        if (state.onCoverTap) {
            state.cover.removeEventListener('click', state.onCoverTap);
            state.onCoverTap = null;
        }
        if (resetToCover && state.coverImage) {
            state.cover.src = state.coverImage;
        }
    });
    mobileCardRotation.clear();
};

const updateCardIndicator = (state) => {
    if (!state || !state.indicator) return;
    const dots = Array.from(state.indicator.children || []);
    if (!dots.length) return;
    const activeIndex = state.index % dots.length;
    dots.forEach((dot, idx) => dot.classList.toggle('active', idx === activeIndex));
};

const initMobileCardRotation = () => {
    stopAllMobileCardRotation(true);
    if (!isMobileViewport()) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const cards = document.querySelectorAll('.property-card');
    if (!cards.length) return;

    cards.forEach((card) => {
        const cover = card.querySelector('.property-header img');
        const button = card.querySelector('.btn-outline');
        if (!cover || !button) return;

        const images = getCardGallery(button);
        if (images.length <= 1) return;

        const header = cover.closest('.property-header');
        const indicator = header ? header.querySelector('.property-gallery-indicator') : null;

        const state = {
            cover,
            images,
            index: 0,
            coverImage: images[0] || cover.src,
            timer: null,
            indicator,
            onCoverTap: null
        };

        cover.src = state.coverImage;
        preloadCardImage(images[1]);
        updateCardIndicator(state);
        state.onCoverTap = () => advanceMobileCardImage(state, 1);
        cover.addEventListener('click', state.onCoverTap);
        mobileCardRotation.set(card, state);
    });

    if (!mobileCardRotation.size) return;

    mobileCardObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const state = mobileCardRotation.get(entry.target);
            if (!state) return;
            if (entry.isIntersecting) {
                startMobileCardInterval(state);
            } else {
                stopMobileCardInterval(state);
            }
        });
    }, { rootMargin: '120px 0px', threshold: 0.25 });

    mobileCardRotation.forEach((_state, card) => {
        mobileCardObserver.observe(card);
    });
};

const scheduleMobileCardRotationInit = () => {
    stopAllMobileCardRotation(true);
    if (mobileCardResizeTimer) {
        window.clearTimeout(mobileCardResizeTimer);
    }
    mobileCardResizeTimer = window.setTimeout(() => {
        initMobileCardRotation();
    }, 180);
};

const updateModalNavState = () => {
    const hasCarousel = modalGallery.length > 1;

    if (modalPrev) modalPrev.classList.toggle('is-hidden', !hasCarousel);
    if (modalNext) modalNext.classList.toggle('is-hidden', !hasCarousel);
    if (modalDots) modalDots.style.display = hasCarousel ? 'flex' : 'none';
};

const renderModalDots = () => {
    if (!modalDots) return;
    modalDots.innerHTML = '';

    modalGallery.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = `modal-dot${index === modalGalleryIndex ? ' active' : ''}`;
        dot.setAttribute('aria-label', `Ir para imagem ${index + 1}`);
        dot.addEventListener('click', () => {
            modalGalleryIndex = index;
            renderModalImage();
        });
        modalDots.appendChild(dot);
    });
};

const renderModalImage = () => {
    if (!modalImg || !modalGallery.length) return;
    modalImg.src = modalGallery[modalGalleryIndex];
    modalImg.alt = `Imagem ${modalGalleryIndex + 1} do imóvel`;

    if (isLightboxOpen && lightboxImg) {
        lightboxImg.src = modalGallery[modalGalleryIndex];
        lightboxImg.alt = `Imagem ampliada ${modalGalleryIndex + 1} do imóvel`;
    }

    if (modalDots) {
        modalDots.querySelectorAll('.modal-dot').forEach((dot, index) => {
            dot.classList.toggle('active', index === modalGalleryIndex);
        });
    }

    if (modalGallery.length > 1) {
        const nextIndex = (modalGalleryIndex + 1) % modalGallery.length;
        const prevIndex = (modalGalleryIndex - 1 + modalGallery.length) % modalGallery.length;
        [nextIndex, prevIndex].forEach((idx) => {
            const src = modalGallery[idx];
            if (!src || preloadedModalImages.has(src)) return;
            const img = new Image();
            img.decoding = 'async';
            img.src = src;
            preloadedModalImages.add(src);
        });
    }
};

const changeModalImage = (step) => {
    if (modalGallery.length <= 1) return;
    modalGalleryIndex = (modalGalleryIndex + step + modalGallery.length) % modalGallery.length;
    renderModalImage();
};

const onModalTouchStart = (event) => {
    if (!modal.classList.contains('is-open') || modalGallery.length <= 1) return;
    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch) return;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
};

const onModalTouchEnd = (event) => {
    if (!modal.classList.contains('is-open') || modalGallery.length <= 1) return;
    if (touchStartX === null || touchStartY === null) return;

    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const minSwipeDistance = 45;

    // Only treat as swipe when horizontal movement is dominant.
    if (absX > minSwipeDistance && absX > absY * 1.2) {
        changeModalImage(deltaX < 0 ? 1 : -1);
    }

    touchStartX = null;
    touchStartY = null;
};

const openPropertyModal = (button) => {
    if (!modal) return;

    // Puxando dados da section do HTML
    document.getElementById("modalTitle").innerText = button.getAttribute('data-title');
    document.getElementById("modalLocation").innerText = button.getAttribute('data-location');
    const bedsCount = parseCount(button.getAttribute('data-beds'));
    const bathsCount = parseCount(button.getAttribute('data-baths'));
    if (modalBedsValue) modalBedsValue.innerText = String(bedsCount);
    if (modalBathsValue) modalBathsValue.innerText = String(bathsCount);
    updateModalFeatureLabels(bedsCount, bathsCount);
    if (modalBedsValue && modalBedsValue.parentElement) modalBedsValue.parentElement.style.display = bedsCount > 0 ? '' : 'none';
    document.getElementById("modalDesc").innerText = button.getAttribute('data-desc');

    modalGallery = getModalGallery(button);
    modalGalleryIndex = 0;
    updateModalNavState();
    renderModalDots();
    renderModalImage();

    if (closeModalTimer) {
        clearTimeout(closeModalTimer);
        closeModalTimer = null;
    }

    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    document.body.style.top = `-${lockedScrollY}px`;
    modal.classList.add('is-open');
};

const closePropertyModal = () => {
    if (!modal || !modal.classList.contains('is-open')) return;

    closeImageLightbox();
    modal.classList.remove('is-open');
    closeModalTimer = window.setTimeout(() => {
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
        document.body.style.top = '';
        window.scrollTo(0, lockedScrollY);
        closeModalTimer = null;
    }, MODAL_ANIMATION_MS);
};

if (modal) {
    document.querySelectorAll('.btn-outline:not([data-page])').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            openPropertyModal(button);
        });
    });

    if (closeIcon) closeIcon.onclick = closePropertyModal;
    if (closeModalButton) closeModalButton.onclick = closePropertyModal;
    if (modalPrev) modalPrev.onclick = () => changeModalImage(-1);
    if (modalNext) modalNext.onclick = () => changeModalImage(1);
    if (modalImg) modalImg.onclick = openImageLightbox;
    if (lightboxClose) lightboxClose.onclick = closeImageLightbox;
    if (imageLightbox) {
        imageLightbox.addEventListener('click', (event) => {
            if (event.target === imageLightbox) closeImageLightbox();
        });
    }
    if (modalImgContainer) {
        modalImgContainer.addEventListener('touchstart', onModalTouchStart, { passive: true });
        modalImgContainer.addEventListener('touchend', onModalTouchEnd, { passive: true });
    }

    stopAllMobileCardRotation(true);

    // Fechar clicando fora do conteúdo
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closePropertyModal();
        }
    });

    // Fechar com tecla Esc
    window.addEventListener('keydown', (event) => {
        if (!modal.classList.contains('is-open')) return;

        if (event.key === 'Escape' && isLightboxOpen) {
            closeImageLightbox();
            return;
        }

        if (event.key === 'ArrowRight') {
            changeModalImage(1);
            return;
        }

        if (event.key === 'ArrowLeft') {
            changeModalImage(-1);
            return;
        }

        if (event.key === 'Escape' && modal.classList.contains('is-open')) {
            closePropertyModal();
        }
    });
}

/* ---------- NAVBAR TOGGLE ---------- */
document.addEventListener('DOMContentLoaded', function() {
    const navToggle = document.querySelector('.nav-toggle');
    const navbar = document.querySelector('.navbar');
    const langCycle = document.getElementById('langCycle');
    const langMenuBtn = document.getElementById('langMenuBtn');
    const langMenu = document.getElementById('langMenu');
    const reviewVideo = document.querySelector('.review-video');

    const syncNavbarOffset = () => {
        if (!navbar) return;
        const navbarHeight = Math.ceil(navbar.getBoundingClientRect().height);
        document.documentElement.style.setProperty('--navbar-offset', `${navbarHeight}px`);
    };

    syncNavbarOffset();
    window.addEventListener('resize', syncNavbarOffset);
    window.addEventListener('load', syncNavbarOffset);
    initPropertyGalleryIndicators();
    initMobileCardRotation();
    window.addEventListener('resize', scheduleMobileCardRotationInit);
    if (mobileViewportQuery && typeof mobileViewportQuery.addEventListener === 'function') {
        mobileViewportQuery.addEventListener('change', scheduleMobileCardRotationInit);
    }

    const warmupReviewVideo = () => {
        if (!reviewVideo || reviewVideo.dataset.preloaded === '1') return;
        reviewVideo.preload = 'auto';
        reviewVideo.load();
        reviewVideo.dataset.preloaded = '1';
    };

    if (reviewVideo) {
        if ('IntersectionObserver' in window) {
            const reviewVideoObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting || entry.intersectionRatio > 0) {
                        warmupReviewVideo();
                        observer.disconnect();
                    }
                });
            }, { rootMargin: '260px 0px' });
            reviewVideoObserver.observe(reviewVideo);
        } else {
            warmupReviewVideo();
        }

        reviewVideo.addEventListener('pointerdown', warmupReviewVideo, { once: true });
        reviewVideo.addEventListener('touchstart', warmupReviewVideo, { passive: true, once: true });
    }

    // Ensure menu starts closed
    if (langMenu) langMenu.classList.remove('open');

    /* Traduções simples (PT / ES) */
    const translations = {
        pt: {
            'nav.home': 'Início',
            'nav.properties': 'Imóveis',
            'nav.services': 'Serviços',
            'nav.contact': 'Contato',
            'nav.about': 'Sobre',
            'hero.title': 'Encontre seu <span>imóvel ideal</span>',
            'hero.desc': 'Encontre o imóvel perfeito para você e sua família com nossa ampla seleção de propriedades.',
            'hero.cta': 'Ver Imóveis Disponíveis',
            'services.title': 'Nossos <span>Serviços</span>',
            'services.subtitle': 'Oferecemos uma ampla gama de serviços para atender às necessidades dos nossos clientes.',
            'properties.title': 'Imóveis <span>Destaque</span>',
            'properties.subtitle': 'Confira nossos imóveis em destaque, selecionados para atender às suas necessidades e preferências.',
            'properties.viewAll': 'Ver todos os imóveis',
            'properties.badge.rent': 'Aluguel',
            'properties.badge.sale': 'Venda',
            'modal.about': 'Sobre o Imóvel',
            'modal.close': 'FECHAR',
            'how.title': 'Como <span>Funciona</span>',
            'how.subtitle': 'Processo simples e transparente para você encontrar seu imóvel',
            'step.search.title': 'Procure',
            'step.search.desc': 'Encontre o imóvel perfeito usando nossos filtros avançados.',
            'step.analyze.title': 'Analise',
            'step.analyze.desc': 'Compare opções, veja fotos e agende visitas presenciais.',
            'step.negotiate.title': 'Negocie',
            'step.enjoy.title': 'Aproveite',
            'step.enjoy.desc': 'Receba as chaves e realize seu sonho imobiliário.',
            'why.title': 'Por que escolher a nossa imobiliaria',
            'why.desc': 'Somos uma empresa especializada em gestão de imóveis, dedicada a oferecer soluções completas para proprietários e inquilinos. Com uma equipe experiente e um portfólio diversificado, garantimos um serviço de alta qualidade, transparência e satisfação para nossos clientes. Nossa missão é facilitar o processo de compra, venda e aluguel de imóveis, proporcionando uma experiência tranquila e eficiente.',
            'why.feature.excellence.title': 'Excelência',
            'why.feature.excellence.desc': 'Compromisso com a qualidade em cada etapa do processo imobiliário.',
            'why.feature.agility.title': 'Agilidade',
            'why.feature.agility.desc': 'Processos rápidos e eficientes para agilizar sua transação imobiliária.',
            'why.feature.team.title': 'Equipe Qualificada',
            'why.feature.team.desc': 'Profissionais experientes e capacitados para atender todas as necessidades do seu imóvel.',
            'why.feature.customer.title': 'Foco no Cliente',
            'why.feature.customer.desc': 'Atendimento personalizado e orientação especializada para garantir a melhor experiência imobiliária.',
            'why.cta': 'Entre em Contato',
            'contact.title': 'Vamos conversar sobre seu <span>próximo imóvel</span>',
            'contact.desc': 'Nossa equipe está pronta para atendê-lo e encontrar a melhor solução para suas necessidades.',
            'contact.call': 'Ligue para nós',
            'contact.hours': 'Segunda a sexta 9h até 00:00<br>Sábado de 09h até às 15h',
            'contact.whatsapp': 'WhatsApp',
            'contact.whatsappNote': 'Atendimento rápido',
            'contact.email': 'Envie um e-mail',
            'contact.visit': 'Atendimento online',
            'contact.address': 'Sem atendimento presencial',
            'form.nameLabel': 'Nome completo',
            'form.namePlaceholder': 'Seu nome',
            'form.phoneLabel': 'Telefone',
            'form.phonePlaceholder': '+54 9 11 1234-5678',
            'form.emailLabel': 'E-mail',
            'form.emailPlaceholder': 'seu@email.com',
            'form.msgLabel': 'Mensagem',
            'form.msgPlaceholder': 'Olá, gostaria de saber mais sobre...',
            'why.cta': 'Entre em Contato',
            'footer.about': 'Desde 2020 confiando em nós 🧡<br><br>Ela chegou do Brasil 🇧🇷 buscando segurança e acompanhamento... e há mais de 3 anos continua alugando com a Lima Imobiliária 🙌<br><br>Para nós, não se trata apenas de alugar um apartamento.<br>Trata-se de construir relações de longo prazo, com transparência e apoio constante.<br><br>Obrigado por continuar nos escolhendo.',
            'footer.servicesTitle': 'Serviços',
            'footer.companyTitle': 'Diferenciais',
            'footer.company.about': 'Atendimento 100% online',
            'footer.company.team': 'Transparência em cada etapa',
            'footer.company.careers': 'Acompanhamento personalizado',
            'footer.company.blog': 'Suporte rápido e contínuo',
            'footer.contactTitle': 'Contato',
            'footer.address': 'Atendimento online<br>Sem atendimento presencial',
            'footer.phone': '(54) 9 11 5264-4915',
            'footer.whatsapp': '(54) 9 11 2785-8950 (WhatsApp)',
            'footer.email': 'limainmobiliariaofc@gmail.com',
            'footer.copyright': '© <span data-year></span> Lima Imobiliária. Todos os direitos reservados.'
        },
        es: {
            'nav.home': 'Inicio',
            'nav.properties': 'Inmuebles',
            'nav.services': 'Servicios',
            'nav.contact': 'Contacto',
            'nav.about': 'Sobre',
            'hero.title': 'Encuentre su <span>propiedad ideal</span>',
            'hero.desc': 'Encuentre la propiedad perfecta para usted y su familia con nuestra amplia selección de inmuebles.',
            'hero.cta': 'Ver Inmuebles Disponibles',
            'services.title': 'Nuestros <span>Servicios</span>',
            'services.subtitle': 'Ofrecemos una amplia gama de servicios para satisfacer las necesidades de nuestros clientes.',
            'properties.title': 'Inmuebles <span>Destacados</span>',
            'properties.subtitle': 'Vea nuestros inmuebles destacados, seleccionados para satisfacer sus necesidades y preferencias.',
            'properties.viewAll': 'Ver todos los inmuebles',
            'properties.badge.rent': 'Alquiler',
            'properties.badge.sale': 'Venta',
            'modal.about': 'Sobre la propiedad',
            'modal.close': 'CERRAR',
            'how.title': 'Cómo <span>Funciona</span>',
            'how.subtitle': 'Proceso simple y transparente para que encuentre su propiedad',
            'step.search.title': 'Busque',
            'step.search.desc': 'Encuentre la propiedad perfecta usando nuestros filtros avanzados.',
            'step.analyze.title': 'Analice',
            'step.analyze.desc': 'Compare opciones, vea fotos y agende visitas presenciales.',
            'step.negotiate.title': 'Negocie',
            'step.enjoy.title': 'Disfrute',
            'step.enjoy.desc': 'Reciba las llaves y haga realidad su sueño inmobiliario.',
            'why.title': 'Por qué elegir nuestra inmobiliaria',
            'why.desc': 'Somos una empresa especializada en la gestión de inmuebles, dedicada a ofrecer soluciones completas para propietarios e inquilinos. Con un equipo experimentado y un portafolio diverso, garantizamos un servicio de alta calidad, transparencia y satisfacción para nuestros clientes. Nuestra misión es facilitar el proceso de compra, venta y alquiler de propiedades, proporcionando una experiencia tranquila y eficiente.',
            'why.feature.excellence.title': 'Excelencia',
            'why.feature.excellence.desc': 'Compromiso con la calidad en cada etapa del proceso inmobiliario.',
            'why.feature.agility.title': 'Agilidad',
            'why.feature.agility.desc': 'Procesos rápidos y eficientes para agilizar su transacción inmobiliaria.',
            'why.feature.team.title': 'Equipo Calificado',
            'why.feature.team.desc': 'Profesionales experimentados y capacitados para atender todas las necesidades de su propiedad.',
            'why.feature.customer.title': 'Foco en el Cliente',
            'why.feature.customer.desc': 'Atención personalizada y orientación especializada para garantizar la mejor experiencia inmobiliaria.',
            'why.cta': 'Contacte',
            'contact.title': 'Hablemos sobre su <span>próxima propiedad</span>',
            'contact.desc': 'Nuestro equipo está listo para atenderle y encontrar la mejor solución para sus necesidades.',
            'contact.call': 'Llámenos',
            'contact.hours': 'Lunes a viernes 9h hasta 00:00<br>Sábado de 09h hasta las 15h',
            'contact.whatsapp': 'WhatsApp',
            'contact.whatsappNote': 'Atención rápida',
            'contact.email': 'Envíe un correo',
            'contact.visit': 'Atención online',
            'contact.address': 'Sin atención presencial',
            'form.nameLabel': 'Nombre completo',
            'form.namePlaceholder': 'Su nombre',
            'form.phoneLabel': 'Teléfono',
            'form.phonePlaceholder': '+54 9 11 1234-5678',
            'form.emailLabel': 'Correo',
            'form.emailPlaceholder': 'su@email.com',
            'form.msgLabel': 'Mensaje',
            'form.msgPlaceholder': 'Hola, quisiera saber más sobre...',
            'footer.about': 'Desde 2020 confiando en nosotros 🧡<br><br>Ella llegó desde Brasil 🇧🇷 buscando seguridad y acompañamiento... y hace más de 3 años que sigue alquilando con Lima Inmobiliaria 🙌<br><br>Para nosotros, no se trata solo de alquilar un departamento.<br>Se trata de construir relaciones a largo plazo, con transparencia y apoyo constante.<br><br>Gracias por seguir eligiéndonos.',
            'footer.servicesTitle': 'Servicios',
            'footer.companyTitle': 'Diferenciales',
            'footer.company.about': 'Atención 100% online',
            'footer.company.team': 'Transparencia en cada etapa',
            'footer.company.careers': 'Acompañamiento personalizado',
            'footer.company.blog': 'Soporte rápido y continuo',
            'footer.contactTitle': 'Contacto',
            'footer.address': 'Atención online<br>Sin atención presencial',
            'footer.phone': '(54) 9 11 5264-4915',
            'footer.whatsapp': '(54) 9 11 2785-8950 (WhatsApp)',
            'footer.email': 'limainmobiliariaofc@gmail.com',
            'footer.copyright': '© <span data-year></span> Lima Inmobiliaria. Todos los derechos reservados.'
        }
    };
    // Additional translation keys for services, form and footer links
    // Portuguese (pt)
    translations.pt['service.management.title'] = 'Gestão de Imóveis';
    translations.pt['service.management.desc'] = 'Administração completa de propriedades.';
    translations.pt['service.rent.title'] = 'Aluguel';
    translations.pt['service.rent.desc'] = 'Encontre os melhores apartamentos.';
    translations.pt['service.sale.title'] = 'Venda';
    translations.pt['service.sale.desc'] = 'Assessoria completa na compra e venda.';
    translations.pt['service.legal.title'] = 'Assessoria Jurídica';
    translations.pt['service.legal.desc'] = 'Suporte legal especializado.';
    translations.pt['service.consult.title'] = 'Consultoria';
    translations.pt['service.consult.desc'] = 'Orientação profissional para investimentos.';
    translations.pt['service.docs.title'] = 'Documentação';
    translations.pt['service.docs.desc'] = 'Cuidamos de toda a burocracia.';
    translations.pt['service.eval.title'] = 'Avaliação';
    translations.pt['service.eval.desc'] = 'Laudos técnicos de valor de mercado.';
    translations.pt['service.finance.title'] = 'Financiamento';
    translations.pt['service.finance.desc'] = 'Auxílio na obtenção de crédito.';
    translations.pt['service.renov.title'] = 'Reformas';
    translations.pt['service.renov.desc'] = 'Gestão de melhorias para valorização.';
    translations.pt['form.title'] = 'Envie sua mensagem';
    translations.pt['form.submit'] = 'Enviar por WhatsApp';

    translations.pt['footer.service.buy'] = 'Compra';
    translations.pt['footer.service.sell'] = 'Venda';
    translations.pt['footer.service.rent'] = 'Aluguel';
    translations.pt['footer.service.manage'] = 'Gestão de Imóveis';

    // Spanish (es)
    translations.es['service.management.title'] = 'Gestión de Inmuebles';
    translations.es['service.management.desc'] = 'Administración completa de propiedades.';
    translations.es['service.rent.title'] = 'Alquiler';
    translations.es['service.rent.desc'] = 'Encontramos los mejores inquilinos.';
    translations.es['service.sale.title'] = 'Venta';
    translations.es['service.sale.desc'] = 'Asesoramiento completo en compra y venta.';
    translations.es['service.legal.title'] = 'Asesoría Jurídica';
    translations.es['service.legal.desc'] = 'Soporte legal especializado.';
    translations.es['service.consult.title'] = 'Consultoría';
    translations.es['service.consult.desc'] = 'Orientación profesional para inversiones.';
    translations.es['service.docs.title'] = 'Documentación';
    translations.es['service.docs.desc'] = 'Nos encargamos de toda la burocracia.';
    translations.es['service.eval.title'] = 'Tasación';
    translations.es['service.eval.desc'] = 'Informes técnicos de valor de mercado.';
    translations.es['service.finance.title'] = 'Financiamiento';
    translations.es['service.finance.desc'] = 'Ayuda en la obtención de crédito.';
    translations.es['service.renov.title'] = 'Reformas';
    translations.es['service.renov.desc'] = 'Gestión de mejoras para valorización.';
    translations.es['form.title'] = 'Envíe su mensaje';
    translations.es['form.submit'] = 'Enviar mensaje por WhatsApp';

    translations.es['footer.service.buy'] = 'Compra';
    translations.es['footer.service.sell'] = 'Venta';
    translations.es['footer.service.rent'] = 'Alquiler';
    translations.es['footer.service.manage'] = 'Gestión de Inmuebles';

    // Featured review section
    translations.pt['review.eyebrow'] = 'Avaliação em Destaque';
    translations.pt['review.title'] = 'A experiência de encontrar o <span>imóvel ideal</span>';
    translations.pt['review.quote'] = '"O atendimento superou todas as minhas expectativas. A equipe entendeu perfeitamente o que eu buscava e o processo foi incrivelmente ágil e transparente."';
    translations.pt['review.name'] = 'Heloisa';
    translations.pt['review.badge'] = 'Avaliação Verificada';
    translations.pt['review.watch'] = 'Assistir Avaliação';

    translations.es['review.eyebrow'] = 'Evaluación Destacada';
    translations.es['review.title'] = 'La experiencia de encontrar la <span>propiedad ideal</span>';
    translations.es['review.quote'] = '"La atención superó todas mis expectativas. El equipo entendió perfectamente lo que buscaba y todo el proceso fue increíblemente ágil y transparente."';
    translations.es['review.name'] = 'Heloisa';
    translations.es['review.badge'] = 'Evaluación Verificada';
    translations.es['review.watch'] = 'Ver Evaluación';

    // Properties cards (PT/ES): visible labels + modal dynamic content
    translations.pt['properties.details'] = 'Ver detalhes';
    translations.es['properties.details'] = 'Ver detalles';
    translations.es['filter.op'] = "Operación";
    translations.es['filter.type'] = "Tipo";
    translations.es['filter.temp'] = "Alquiler temporario";
    translations.es['filter.trad'] = "Alquiler tradicional";
    translations.es['properties.badge.temp'] = "Alquiler temporario";
    translations.es['properties.badge.trad'] = "Alquiler tradicional";
    translations.pt['filter.op'] = "Operação";
    translations.pt['filter.type'] = "Tipo";
    translations.pt['filter.temp'] = "Aluguel temporário";
    translations.pt['filter.trad'] = "Aluguel tradicional";
    translations.pt['properties.badge.temp'] = "Aluguel temporário";
    translations.pt['properties.badge.trad'] = "Aluguel tradicional";
    translations.es['price.month'] = "/ mes";
    translations.es['price.ask'] = "Consultar precio";
    translations.es['trust.1.t'] = "Desde 2020";
    translations.es['trust.1.d'] = "Acompañando a inquilinos y propietarios";
    translations.es['trust.2.t'] = "Toda Buenos Aires";
    translations.es['trust.2.d'] = "Inmuebles en distintos barrios de la ciudad";
    translations.es['trust.3.t'] = "Atención 100% online";
    translations.es['trust.3.d'] = "Rápida, por WhatsApp";
    translations.es['trust.4.t'] = "Español, portugués e inglés";
    translations.es['trust.4.d'] = "Te atendemos en tu idioma";
    translations.pt['price.month'] = "/ mês";
    translations.pt['price.ask'] = "Consultar preço";
    translations.pt['trust.1.t'] = "Desde 2020";
    translations.pt['trust.1.d'] = "Acompanhando inquilinos e proprietários";
    translations.pt['trust.2.t'] = "Toda Buenos Aires";
    translations.pt['trust.2.d'] = "Imóveis em diversos bairros da cidade";
    translations.pt['trust.3.t'] = "Atendimento 100% online";
    translations.pt['trust.3.d'] = "Rápido, pelo WhatsApp";
    translations.pt['trust.4.t'] = "Espanhol, português e inglês";
    translations.pt['trust.4.d'] = "Atendemos no seu idioma";
    translations.es['nav.portal'] = "Portal";
    translations.es['portal.title'] = "Portal <span>Lima</span>";
    translations.es['portal.subtitle'] = "Un sistema propio para que inquilinos y propietarios sigan todo en un solo lugar, desde el celular.";
    translations.es['portal.tenant.title'] = "Portal del Inquilino";
    translations.es['portal.tenant.desc'] = "Acceso exclusivo a tu departamento y a tu contrato.";
    translations.es['portal.tenant.f1'] = "Consultá tu contrato y tus datos";
    translations.es['portal.tenant.f2'] = "Abrí reclamos y seguí su estado";
    translations.es['portal.tenant.f3'] = "Confirmá o rechazá el día y la hora de cada reparación";
    translations.es['portal.tenant.f4'] = "Informá tu fecha de pago y subí fotos del departamento";
    translations.es['portal.tenant.cta'] = "Ingresar como inquilino";
    translations.es['portal.owner.title'] = "Portal del Propietario";
    translations.es['portal.owner.desc'] = "Acceso exclusivo a tus inmuebles, con total transparencia.";
    translations.es['portal.owner.f1'] = "Estado de cada inmueble de un vistazo";
    translations.es['portal.owner.f2'] = "Monto exacto de cada liquidación e historial de pagos";
    translations.es['portal.owner.f3'] = "Contrato vigente del inquilino actual";
    translations.es['portal.owner.f4'] = "Reclamos del inmueble y solicitud de disponibilización";
    translations.es['portal.owner.cta'] = "Ingresar como propietario";
    translations.es['portal.note'] = "Cada usuario accede únicamente a su propia información.";
    translations.pt['nav.portal'] = "Portal";
    translations.pt['portal.title'] = "Portal <span>Lima</span>";
    translations.pt['portal.subtitle'] = "Um sistema próprio para que inquilinos e proprietários acompanhem tudo em um só lugar, pelo celular.";
    translations.pt['portal.tenant.title'] = "Portal do Inquilino";
    translations.pt['portal.tenant.desc'] = "Acesso exclusivo ao seu apartamento e ao seu contrato.";
    translations.pt['portal.tenant.f1'] = "Consulte seu contrato e seus dados";
    translations.pt['portal.tenant.f2'] = "Abra reclamações e acompanhe o andamento";
    translations.pt['portal.tenant.f3'] = "Confirme ou recuse o dia e a hora de cada reparo";
    translations.pt['portal.tenant.f4'] = "Informe sua data de pagamento e envie fotos do apartamento";
    translations.pt['portal.tenant.cta'] = "Entrar como inquilino";
    translations.pt['portal.owner.title'] = "Portal do Proprietário";
    translations.pt['portal.owner.desc'] = "Acesso exclusivo aos seus imóveis, com total transparência.";
    translations.pt['portal.owner.f1'] = "Status de cada imóvel num relance";
    translations.pt['portal.owner.f2'] = "Valor exato de cada repasse e histórico de pagamentos";
    translations.pt['portal.owner.f3'] = "Contrato vigente do inquilino atual";
    translations.pt['portal.owner.f4'] = "Reclamações do imóvel e solicitação de disponibilização";
    translations.pt['portal.owner.cta'] = "Entrar como proprietário";
    translations.pt['portal.note'] = "Cada usuário acessa somente as suas próprias informações.";
    translations.pt['filter.all'] = 'Todos'; translations.es['filter.all'] = 'Todos';
    translations.pt['filter.sale'] = 'Vendas'; translations.es['filter.sale'] = 'Ventas';
    translations.pt['filter.office'] = 'Escritórios'; translations.es['filter.office'] = 'Oficinas';
    translations.pt['filter.shop'] = 'Loja comercial'; translations.es['filter.shop'] = 'Local comercial';
    translations.pt['modal.beds'] = 'Quartos';
    translations.pt['modal.baths'] = 'Banheiros';
    translations.es['modal.beds'] = 'Habitaciones';
    translations.es['modal.baths'] = 'Baños';

    translations.pt['properties.card1.title'] = 'Apartamento Mobiliado';
    translations.pt['properties.card1.modalTitle'] = 'Apartamento Mobiliado';
    translations.pt['properties.card1.location'] = 'Av. Corrientes 700 (11D) - Microcentro';
    translations.pt['properties.card1.desc'] = `🔥 VIVA NO CORACAO DE BUENOS AIRES 🔥

📍 Av. Corrientes 700 (11D) – Microcentro

Na iconica Avenida Corrientes, a avenida mais vibrante da cidade.
Teatros, cafes historicos, supermercados, universidades e todo o transporte a poucos passos.

Localizacao estrategica total.
Metro linhas B, C e D a minutos.

💰 OPORTUNIDADE – APENAS USD 500 POR 1 ANO FIXO
* Aluguel mensal: USD 500
* Expensas: $130.000
* Servicos: luz e WiFi por conta do inquilino

🏠 Departamento amoblado
🛏 Confortavel, funcional e pronto para morar
🧺 Inclui lavarropas
✨ Ideal para estudantes e profissionais estrangeiros

Viva em uma das zonas mais procuradas da cidade, com movimento, seguranca e conexao imediata a tudo.

⚠️ Alta demanda por localizacao e preco.`;

    translations.pt['properties.card2.title'] = 'Apartamento de 4 Ambientes';
    translations.pt['properties.card2.modalTitle'] = 'Apartamento de 4 Ambientes';
    translations.pt['properties.card2.location'] = 'Thames 2300 (A) - Palermo';
    translations.pt['properties.card2.desc'] = `✨ Apartamento de 4 ambientes em Palermo – Disponivel ✨
📍 Localizado em uma das melhores zonas de Palermo: perto de cafes, parques, centros comerciais, metro e toda a vida cultural do bairro.

📌 Thames 2300 (A) – Palermo
💵 1.600.000
➕ Luz, gas e Wi-Fi se pagam a parte
📆 Contrato semestral com reajuste semestral

🏡 Caracteristicas:
Amoblado
1 suite
Lavarropas
4 banheiros
Capacidade para 5–6 pessoas
Aceita pets (pequenos)
Nao aceita criancas`;

    
    translations.pt['properties.card4.title'] = 'Estúdio em Recoleta';
    translations.pt['properties.card4.modalTitle'] = 'Estúdio com mezanino - Recoleta';
    translations.pt['properties.card4.location'] = 'Francisco de Vittoria 2300 - Recoleta';
    translations.pt['properties.card4.desc'] = `📍 Francisco de Vittoria 2300 - Recoleta
📌 Zona Plaza Francia | La Isla - Entre Guido e Agote

Studio com entrepiso · Amoblado e equipado
Localizado na exclusiva zona Plaza Francia - La Isla, este distinguido departamento tipo studio com entrepiso combina conforto, luminosidade e tranquilidade, em um dos ambientes mais prestigiados de Recoleta.
A propriedade se encontra em uma area residencial de alto nivel, rodeada de espacos verdes, centros culturais, comercios seletos e excelente conectividade urbana.

Caracteristicas do imovel
Studio com entrepiso
Totalmente amoblado e equipado
Distribuicao funcional e moderna
Ambientes muito luminosos
Maximo nivel de silencio e privacidade

Localizacao destacada
A metros da Plaza Francia
Perto do Museo Nacional de Bellas Artes
Proximo a Av. Libertador e Av. Figueroa Alcorta
Em frente ao Ministerio de Seguridad e a Embaixada Britanica
Excelente acesso ao transporte publico
🚗 Estacionamento gratuito disponivel na quadra

    Condicoes
    Aluguel mensal: USD 500
    Expensas: $140.000
    Servicos por conta do inquilino: luz, agua, ABL e WiFi`;

    translations.pt['properties.card5.title'] = 'Estúdio Equipado';
    translations.pt['properties.card5.modalTitle'] = 'Estúdio Equipado';
    translations.pt['properties.card5.location'] = 'Av. Scalabrini Ortiz 3200 - Palermo - CABA';
    translations.pt['properties.card5.desc'] = `ALUGUEL – ESTUDIO EQUIPADO

📍 Av. Scalabrini Ortiz 3200 – Palermo – CABA
💲 $650.000 por mes

👤 Capacidade: 1 pessoa (nao conta com cama de casal)

🏡 O DEPARTAMENTO
Estudio confortavel e totalmente equipado.

✔️ Sala de estar/jantar com mesa para 4 pessoas
✔️ Sofa confortavel
✔️ 1 sommier
✔️ Ar-condicionado frio/calor
✔️ Ventilador de teto
✔️ Cofre

🍽 Cozinha equipada
* Geladeira
* Micro-ondas
* Cafeteira
* Espremedor
* Loucas para 4 pessoas

✔️ TV com Chromecast
✔️ Wi-Fi

💰 CONDICOES DO ALUGUEL
📆 Contrato minimo: 6 meses
📊 Ajuste: a cada 3 meses pelo IPC

💲 Aluguel: $650.000 mensais
🔐 Deposito de garantia: USD 500

Servicos
✔️ Inclui o proprietario:
* Expensas ordinarias e extraordinarias

✔️ A cargo do inquilino:
* ABL
* Luz
* Gas
* AYSA
* Internet

📍 LOCALIZACAO
A poucos passos dos parques e lagos dos Bosques de Palermo, com excelente conexao pela Av. del Libertador e Av. Las Heras.
Zona residencial, segura e muito procurada.`;

    translations.es['properties.card1.title'] = 'Departamento Amoblado';
    translations.es['properties.card1.modalTitle'] = 'Departamento Amoblado';
    translations.es['properties.card1.location'] = 'Av. Corrientes 700 (11D) - Microcentro';
    translations.es['properties.card1.desc'] = `🔥 VIVI EN EL CORAZON DE BUENOS AIRES 🔥

📍 Av. Corrientes 700 (11D) – Microcentro

Sobre la iconica Avenida Corrientes, la avenida mas vibrante de la ciudad.
Teatros, cafes historicos, supermercados, universidades y todo el transporte a pocos pasos.

Ubicacion estrategica total.
Subte lineas B, C y D a minutos.

💰 OPORTUNIDAD – SOLO USD 500 POR 1 ANO FIJO
* Alquiler mensual: USD 500
* Expensas: $130.000
* Servicios: luz y WiFi a cargo del inquilino

🏠 Departamento amoblado
🛏 Comodo, funcional y listo para mudarse
🧺 Incluye lavarropas
✨ Ideal para estudiantes y profesionales extranjeros

Vivi en una de las zonas mas buscadas de la ciudad, con movimiento, seguridad y conexion inmediata a todo.

⚠️ Alta demanda por ubicacion y precio.`;

    translations.es['properties.card2.title'] = 'Departamento de 4 Ambientes';
    translations.es['properties.card2.modalTitle'] = 'Departamento de 4 Ambientes';
    translations.es['properties.card2.location'] = 'Thames 2300 (A) - Palermo';
    translations.es['properties.card2.desc'] = `✨ Departamento de 4 ambientes en Palermo – Disponible ✨
📍 Ubicado en una de las mejores zonas de Palermo: cerca de cafés, parques, centros comerciales, subte y toda la movida cultural del barrio.

📌 Thames 2300 (A) – Palermo
💵 1.600.000
➕ Luz, gas y wifi se pagan aparte
📆 Contrato semestral reajuste semestral

🏡 Características:
Amoblado
1 suite
Lavarropas
4 baños
Capacidad 5–6 personas
Acepta mascotas (chicas)
No acepta niños`;

    
    translations.es['properties.card4.title'] = 'Studio en Recoleta';
    translations.es['properties.card4.modalTitle'] = 'Studio con Entrepiso - Recoleta';
    translations.es['properties.card4.location'] = 'Francisco de Vittoria 2300 - Recoleta';
    translations.es['properties.card4.desc'] = `📍 Francisco de Vittoria 2300 – Recoleta
📌 Zona Plaza Francia | La Isla – Entre Guido y Agote

Studio con entrepiso · Amoblado y equipado
Ubicado en la exclusiva zona Plaza Francia – La Isla, este distinguido departamento tipo studio con entrepiso combina confort, luminosidad y tranquilidad, en uno de los entornos más prestigiosos de Recoleta.
La propiedad se encuentra en un área residencial de alto nivel, rodeada de espacios verdes, centros culturales, comercios selectos y una excelente conectividad urbana.

Características del inmueble
Studio con entrepiso
Totalmente amoblado y equipado
Distribución funcional y moderna
Ambientes muy luminosos
Máximo nivel de silencio y privacidad

Ubicación destacada
A metros de Plaza Francia
Cercano al Museo Nacional de Bellas Artes
Próximo a Av. Libertador y Av. Figueroa Alcorta
Frente al Ministerio de Seguridad y la Embajada Británica
Excelente acceso a transporte público
🚗 Estacionamiento gratuito disponible en la cuadra

    Condiciones
    Alquiler mensual: USD 500
    Expensas: $140.000
    Servicios a cargo del inquilino: luz, agua, ABL y WiFi`;

    translations.es['properties.card5.title'] = 'Estudio Equipado';
    translations.es['properties.card5.modalTitle'] = 'Estudio Equipado';
    translations.es['properties.card5.location'] = 'Av. Scalabrini Ortiz 3200 - Palermo - CABA';
    translations.es['properties.card5.desc'] = `ALQUILER – ESTUDIO EQUIPADO

📍 Av. Scalabrini Ortiz 3200 – Palermo – CABA
💲 $650.000 por mes

👤 Capacidad: 1 persona (no cuenta con cama doble)

🏡 EL DEPARTAMENTO
Estudio confortable y totalmente equipado.

✔️ Living-comedor con mesa para 4 personas
✔️ Sillon comodo
✔️ 1 sommier
✔️ Aire acondicionado frio/calor
✔️ Ventilador de techo
✔️ Caja de seguridad

🍽 Cocina equipada
* Heladera
* Microondas
* Cafetera
* Juguera
* Vajilla para 4 personas

✔️ TV con Chromecast
✔️ WiFi

💰 CONDICIONES DEL ALQUILER
📆 Contrato minimo: 6 meses
📊 Ajuste: cada 3 meses por IPC

💲 Alquiler: $650.000 mensuales
🔐 Deposito de garantia: USD 500

Servicios
✔️ Incluye el propietario:
* Expensas ordinarias y extraordinarias

✔️ A cargo del inquilino:
* ABL
* Luz
* Gas
* AYSA
* Internet

📍 UBICACION
A pasos de los parques y lagos de Bosques de Palermo, con excelente conexion por Av. del Libertador y Av. Las Heras.
Zona residencial, segura y muy buscada.`;

    // additional small keys
    translations.pt['step.negotiation'] = 'Nossa equipe ajuda em toda a negociação e documentação.';
    translations.es['step.negotiation'] = 'Nuestro equipo ayuda en toda la negociación y documentación.';

    translations.pt['why.featureDesc'] = 'Atendimento personalizado e orientação especializada para garantir a melhor experiência imobiliária.';
    translations.es['why.featureDesc'] = 'Atención personalizada y orientación especializada para garantizar la mejor experiencia inmobiliaria.';
    // Satisfaction stat
    translations.pt['stat.satisfaction'] = 'Taxa de Satisfação';
    translations.es['stat.satisfaction'] = 'Tasa de Satisfacción';

    const normalizeTranslationDict = (dict) => {
        Object.keys(dict).forEach((key) => {
            if (typeof dict[key] === 'string') {
                dict[key] = fixMojibakeText(dict[key]);
            }
        });
    };

    normalizeTranslationDict(translations.pt);
    normalizeTranslationDict(translations.es);

    function updateYearSpans(root = document) {
        const year = String(new Date().getFullYear());
        root.querySelectorAll('[data-year]').forEach(el => {
            el.textContent = year;
        });
    }

    translations.es['filter.r1'] = '1 amb.'; translations.pt['filter.r1'] = '1 amb.';
    translations.es['filter.r2'] = '2 amb.'; translations.pt['filter.r2'] = '2 amb.';
    translations.es['filter.r3'] = '3 amb.'; translations.pt['filter.r3'] = '3 amb.';
    translations.es['filter.r4'] = '4 amb.'; translations.pt['filter.r4'] = '4 amb.';
    translations.es['filter.r5'] = '5 amb.'; translations.pt['filter.r5'] = '5 amb.';
    translations.en = Object.assign({}, translations.es, {
"nav.home": "Home",
"nav.properties": "Properties",
"nav.services": "Services",
"nav.contact": "Contact",
"nav.about": "About",
"nav.portal": "Portal",
"hero.title": "Find your <span>ideal property</span>",
"hero.desc": "Find the perfect property for you and your family from our wide selection of listings.",
"hero.cta": "View Available Properties",
"services.title": "Our <span>Services</span>",
"services.subtitle": "We offer a wide range of services to meet our clients' needs.",
"properties.title": "Featured <span>Properties</span>",
"properties.subtitle": "Browse our featured properties, selected to suit your needs and preferences.",
"properties.viewAll": "View all properties",
"properties.badge.rent": "Rental",
"properties.badge.sale": "For sale",
"properties.badge.temp": "Temporary rental",
"properties.badge.trad": "Traditional rental",
"properties.details": "View details",
"modal.about": "About the property",
"modal.close": "CLOSE",
"modal.beds": "Bedrooms",
"modal.baths": "Bathrooms",
"how.title": "How it <span>works</span>",
"how.subtitle": "A simple, transparent process to help you find your property",
"step.search.title": "Search",
"step.search.desc": "Find the perfect property using our advanced filters.",
"step.analyze.title": "Compare",
"step.analyze.desc": "Compare options, view photos and schedule in-person visits.",
"step.negotiate.title": "Negotiate",
"step.negotiation": "Our team helps with all the negotiation and paperwork.",
"step.enjoy.title": "Enjoy",
"step.enjoy.desc": "Get the keys and make your real estate dream come true.",
"why.title": "Why choose our agency",
"why.desc": "We are a company specialized in property management, dedicated to offering complete solutions for owners and tenants. With an experienced team and a diverse portfolio, we guarantee high-quality, transparent service and satisfaction for our clients. Our mission is to make buying, selling and renting easier, providing a calm and efficient experience.",
"why.feature.excellence.title": "Excellence",
"why.feature.excellence.desc": "Commitment to quality at every stage of the real estate process.",
"why.feature.agility.title": "Agility",
"why.feature.agility.desc": "Fast, efficient processes to speed up your real estate transaction.",
"why.feature.team.title": "Qualified Team",
"why.feature.team.desc": "Experienced, trained professionals ready to handle all your property needs.",
"why.feature.customer.title": "Client Focus",
"why.feature.customer.desc": "Personalized attention and expert guidance to ensure the best real estate experience.",
"why.cta": "Contact us",
"contact.title": "Let's talk about your <span>next property</span>",
"contact.desc": "Our team is ready to help you and find the best solution for your needs.",
"contact.call": "Call us",
"contact.hours": "Monday to Friday 9am to midnight<br>Saturday 9am to 3pm",
"contact.whatsapp": "WhatsApp",
"contact.whatsappNote": "Quick response",
"contact.email": "Send us an email",
"contact.visit": "Online service",
"contact.address": "No in-person service",
"form.title": "Send us a message",
"form.nameLabel": "Full name",
"form.namePlaceholder": "Your name",
"form.phoneLabel": "Phone",
"form.phonePlaceholder": "+54 9 11 1234-5678",
"form.emailLabel": "Email",
"form.emailPlaceholder": "you@email.com",
"form.msgLabel": "Message",
"form.msgPlaceholder": "Hi, I would like to know more about...",
"form.submit": "Send message via WhatsApp",
"footer.about": "Since 2020, trusted by our clients 🧡<br><br>She came from Brazil 🇧🇷 looking for safety and support... and has been renting with Lima Inmobiliaria for over 3 years 🧡<br><br>For us, it is not just about renting an apartment.<br>It is about building long-term relationships, with transparency and constant support.<br><br>Thank you for continuing to choose us.",
"footer.servicesTitle": "Services",
"footer.companyTitle": "What sets us apart",
"footer.company.about": "100% online service",
"footer.company.team": "Transparency at every stage",
"footer.company.careers": "Personalized support",
"footer.company.blog": "Fast, ongoing support",
"footer.contactTitle": "Contact",
"footer.address": "Online service<br>No in-person service",
"footer.copyright": "© <span data-year></span> Lima Inmobiliaria. All rights reserved.",
"footer.service.buy": "Buy",
"footer.service.sell": "Sell",
"footer.service.rent": "Rent",
"footer.service.manage": "Property management",
"service.management.title": "Property Management",
"service.management.desc": "Complete property administration.",
"service.rent.title": "Rentals",
"service.rent.desc": "We find the best tenants.",
"service.sale.title": "Sales",
"service.sale.desc": "Full support for buying and selling.",
"service.legal.title": "Legal Advice",
"service.legal.desc": "Specialized legal support.",
"service.docs.title": "Documentation",
"service.docs.desc": "We take care of all the paperwork.",
"service.eval.title": "Appraisal",
"service.eval.desc": "Technical market value reports.",
"stat.satisfaction": "Satisfaction Rate",
"review.eyebrow": "Featured Review",
"review.title": "The experience of finding the <span>ideal property</span>",
"review.quote": "\"The service exceeded all my expectations. The team understood exactly what I was looking for and the whole process was incredibly fast and transparent.\"",
"review.name": "Heloisa",
"review.badge": "Verified Review",
"properties.card1.title": "Furnished Apartment",
"properties.card1.location": "Av. Corrientes 700 (11D) - Microcentro",
"properties.card1.modalTitle": "Furnished Apartment",
"properties.card1.desc": "🏙️ LIVE IN THE HEART OF BUENOS AIRES 🏙️\n\n📍 Av. Corrientes 700 (11D) – Microcentro\n\nOn the iconic Avenida Corrientes, the city's most vibrant avenue.\nTheaters, historic cafés, supermarkets, universities and all public transport a few steps away.\n\nTotally strategic location.\nSubway lines B, C and D within minutes.\n\n💰 OPPORTUNITY – ONLY USD 500 FOR A FIXED 1-YEAR TERM\n* Monthly rent: USD 500\n* Expensas (building fees): ARS 130,000\n* Utilities: electricity and WiFi paid by the tenant\n\n✔ Furnished apartment\n✔ Comfortable, functional and move-in ready\n✔ Washing machine included\n✔ Ideal for foreign students and professionals\n\nLive in one of the most sought-after areas of the city, with activity, safety and immediate connection to everything.\n\n🔥 High demand due to location and price.",
"properties.card2.title": "4-Room Apartment",
"properties.card2.location": "Thames 2300 (A) - Palermo",
"properties.card2.modalTitle": "4-Room Apartment",
"properties.card2.desc": "🏡 4-room apartment in Palermo – Available 🏡\n📍 Located in one of the best areas of Palermo: close to cafés, parks, shopping centers, subway and all the cultural life of the neighborhood.\n\n📌 Thames 2300 (A) – Palermo\n💰 ARS 1,600,000\n⚡ Electricity, gas and WiFi are paid separately\n📄 6-month contract with 6-month rent adjustment\n\n✨ Features:\nFurnished\n1 en-suite bedroom\nWashing machine\n4 bathrooms\nCapacity 5–6 people\nPets accepted (small)\nChildren not accepted",
"properties.card4.title": "Studio in Recoleta",
"properties.card4.location": "Francisco de Vittoria 2300 - Recoleta",
"properties.card4.modalTitle": "Studio with Mezzanine - Recoleta",
"properties.card4.desc": "📍 Francisco de Vittoria 2300 - Recoleta\n🌳 Plaza Francia | La Isla area - Between Guido and Agote\n\nStudio with mezzanine – Furnished and equipped\nLocated in the exclusive Plaza Francia - La Isla area, this distinguished studio apartment with a mezzanine combines comfort, natural light and calm, in one of the most prestigious settings in Recoleta.\nThe property is in a high-end residential area, surrounded by green spaces, cultural centers, select shops and excellent urban connectivity.\n\nProperty features\nStudio with mezzanine\nFully furnished and equipped\nFunctional, modern layout\nVery bright rooms\nMaximum level of quiet and privacy\n\nPrime location\nMeters from Plaza Francia\nNear the National Museum of Fine Arts\nClose to Av. Libertador and Av. Figueroa Alcorta\nFacing the Ministry of Security and the British Embassy\nExcellent access to public transport\n🚗 Free street parking available on the block\n\nConditions\nMonthly rent: USD 500\nExpensas: ARS 140,000\nTenant pays: electricity, water, ABL (property tax) and WiFi",
"portal.title": "Lima <span>Portal</span>",
"portal.subtitle": "Our own system so tenants and owners can follow everything in one place, from their phone.",
"portal.tenant.title": "Tenant Portal",
"portal.tenant.desc": "Exclusive access to your apartment and your lease.",
"portal.tenant.f1": "View your lease and your details",
"portal.tenant.f2": "Open claims and follow their progress",
"portal.tenant.f3": "Confirm or decline the day and time of each repair",
"portal.tenant.f4": "Report your payment date and upload photos of the apartment",
"portal.tenant.cta": "Sign in as tenant",
"portal.owner.title": "Owner Portal",
"portal.owner.desc": "Exclusive access to your properties, with full transparency.",
"portal.owner.f1": "Status of each property at a glance",
"portal.owner.f2": "Exact amount of each payout and payment history",
"portal.owner.f3": "Current lease of the existing tenant",
"portal.owner.f4": "Property claims and availability requests",
"portal.owner.cta": "Sign in as owner",
"portal.note": "Each user can only access their own information.",
"filter.all": "All",
"filter.sale": "For sale",
"filter.office": "Offices",
"filter.shop": "Commercial space",
"filter.op": "Listing",
"filter.type": "Type",
"filter.temp": "Temporary rental",
"filter.trad": "Traditional rental",
"trust.1.t": "Since 2020",
"trust.1.d": "Supporting tenants and owners",
"trust.2.t": "All of Buenos Aires",
"trust.2.d": "Properties in neighborhoods across the city",
"trust.3.t": "100% online service",
"trust.3.d": "Fast, via WhatsApp",
"trust.4.t": "Spanish, Portuguese and English",
"trust.4.d": "We serve you in your language",
"price.month": "/ month",
"price.ask": "Ask for price",
"filter.r1": "1 room",
"filter.r2": "2 rooms",
"filter.r3": "3 rooms",
"filter.r4": "4 rooms",
"filter.r5": "5 rooms"
});

    Object.assign(translations.es, {"properties.nv5100.title": "Departamento 2 Ambientes en Palermo", "properties.nv5100.modalTitle": "Alquiler Temporario – 2 Ambientes en Palermo", "properties.nv5100.location": "Niceto Vega 5100 - Palermo", "properties.nv5100.desc": "ALQUILER TEMPORARIO – 2 AMBIENTES EN PALERMO\n\n📍 Niceto Vega 5100, Palermo – Ciudad de Buenos Aires\n\nDepartamento de 2 ambientes amoblado y equipado, ubicado en Palermo, una de las zonas más buscadas de Buenos Aires.\n\nOfrece un espacio cómodo y funcional, ideal para una estadía temporaria de hasta 2 personas. Está completamente amoblado y equipado para brindar comodidad y practicidad desde el primer día.\n\nCaracterísticas del departamento\n- 2 ambientes\n- Amoblado y equipado\n- Ideal para 2 personas\n- 2 sommier individuales\n- Aire acondicionado\n- Calefacción\n- Lavarropas\n\nValor del alquiler\nU$S 700 mensuales\n\nGastos\nA cargo del propietario: expensas, agua y ABL\nA cargo del inquilino: luz, gas e internet\n\nUbicación\nSobre Niceto Vega al 5100, en Palermo, próximo a Thames y rodeado de una amplia variedad de comercios, gastronomía, servicios y opciones de transporte.\n\nConsultá disponibilidad y condiciones de alquiler con LIMA INMOBILIARIA."});
    Object.assign(translations.pt, {"properties.nv5100.title": "Apartamento 2 Ambientes em Palermo", "properties.nv5100.modalTitle": "Aluguel Temporário – 2 Ambientes em Palermo", "properties.nv5100.location": "Niceto Vega 5100 - Palermo", "properties.nv5100.desc": "ALUGUEL TEMPORÁRIO – 2 AMBIENTES EM PALERMO\n\n📍 Niceto Vega 5100, Palermo – Cidade de Buenos Aires\n\nApartamento de 2 ambientes mobiliado e equipado, localizado em Palermo, uma das regiões mais procuradas de Buenos Aires.\n\nOferece um espaço confortável e funcional, ideal para uma estadia temporária de até 2 pessoas. É totalmente mobiliado e equipado para oferecer conforto e praticidade desde o primeiro dia.\n\nCaracterísticas do apartamento\n- 2 ambientes\n- Mobiliado e equipado\n- Ideal para 2 pessoas\n- 2 camas de solteiro (sommier)\n- Ar-condicionado\n- Aquecimento\n- Máquina de lavar roupa\n\nValor do aluguel\nU$S 700 mensais\n\nDespesas\nPor conta do proprietário: expensas, água e ABL\nPor conta do inquilino: luz, gás e internet\n\nLocalização\nNa Niceto Vega 5100, em Palermo, perto da Thames e cercado de grande variedade de comércios, gastronomia, serviços e opções de transporte.\n\nConsulte disponibilidade e condições de aluguel com a LIMA INMOBILIARIA."});
    Object.assign(translations.en, {"properties.nv5100.title": "2-Room Apartment in Palermo", "properties.nv5100.modalTitle": "Temporary Rental – 2-Room Apartment in Palermo", "properties.nv5100.location": "Niceto Vega 5100 - Palermo", "properties.nv5100.desc": "TEMPORARY RENTAL – 2-ROOM APARTMENT IN PALERMO\n\n📍 Niceto Vega 5100, Palermo – Buenos Aires City\n\nFurnished and equipped 2-room apartment in Palermo, one of the most sought-after areas of Buenos Aires.\n\nIt offers a comfortable, functional space, ideal for a temporary stay for up to 2 people. It is fully furnished and equipped to provide comfort and convenience from day one.\n\nApartment features\n- 2 rooms\n- Furnished and equipped\n- Ideal for 2 people\n- 2 single sommier beds\n- Air conditioning\n- Heating\n- Washing machine\n\nRent\nUSD 700 per month\n\nExpenses\nPaid by the owner: expensas (building fees), water and ABL (property tax)\nPaid by the tenant: electricity, gas and internet\n\nLocation\nOn Niceto Vega 5100, in Palermo, close to Thames and surrounded by a wide variety of shops, restaurants, services and transport options.\n\nAsk about availability and rental conditions with LIMA INMOBILIARIA."});


    Object.assign(translations.es, {"properties.vc400.title": "Departamento 2 Ambientes en Villa Crespo", "properties.vc400.modalTitle": "2 Ambientes en Villa Crespo – Alquiler Temporario", "properties.vc400.location": "Thames 400 - Villa Crespo", "properties.vc400.desc": "2 AMBIENTES EN VILLA CRESPO – ALQUILER TEMPORARIO\n\n📍 Thames 400, Villa Crespo – Ciudad de Buenos Aires\n\nDepartamento de 2 ambientes amplios y funcionales, ubicado en una excelente zona de Villa Crespo, con muy buena conexión hacia Palermo y el centro de Buenos Aires.\n\nLa propiedad ofrece espacios cómodos y luminosos, siendo una buena alternativa para una persona o pareja que busca instalarse y vivir cómodamente en la ciudad.\n\nCaracterísticas del departamento\n- 2 ambientes amplios\n- 1 baño completo\n- Muy buena luminosidad\n- Apto para mascotas pequeñas\n- Posibilidad de alquilar con o sin cama\n- Excelente ubicación\n\nValor y condiciones\nAlquiler mensual: $750.000\nEl valor incluye topes de consumo de luz y gas.\nContrato: 1 año\nReajuste: semestral\nAcepta mascota\nWi-Fi y luz: a cargo del inquilino.\n\nUbicación\nSobre Thames al 400, Villa Crespo, en una zona estratégica de Buenos Aires, rodeada de comercios, supermercados, restaurantes y servicios.\n\nSu ubicación permite acceder fácilmente a Palermo, Villa Crespo y el centro de la ciudad, convirtiéndolo en una opción práctica para quienes buscan comodidad y buena conectividad.\n\nDisponibilidad\nDisponible para visitar.\n\nSi estás buscando un departamento de 2 ambientes en Villa Crespo, contactanos para consultar disponibilidad, condiciones y coordinar una visita.\n\nLIMA INMOBILIARIA", "properties.vc400.price": "$750.000"});
    Object.assign(translations.pt, {"properties.vc400.title": "Apartamento 2 Ambientes em Villa Crespo", "properties.vc400.modalTitle": "2 Ambientes em Villa Crespo – Aluguel Temporário", "properties.vc400.location": "Thames 400 - Villa Crespo", "properties.vc400.desc": "2 AMBIENTES EM VILLA CRESPO – ALUGUEL TEMPORÁRIO\n\n📍 Thames 400, Villa Crespo – Cidade de Buenos Aires\n\nApartamento de 2 ambientes amplos e funcionais, localizado em uma excelente região de Villa Crespo, com ótima conexão com Palermo e o centro de Buenos Aires.\n\nO imóvel oferece espaços confortáveis e iluminados, sendo uma boa alternativa para uma pessoa ou casal que busca se instalar e viver com conforto na cidade.\n\nCaracterísticas do apartamento\n- 2 ambientes amplos\n- 1 banheiro completo\n- Muito boa luminosidade\n- Aceita animais de pequeno porte\n- Possibilidade de alugar com ou sem cama\n- Excelente localização\n\nValor e condições\nAluguel mensal: ARS 750.000\nO valor inclui limites de consumo de luz e gás.\nContrato: 1 ano\nReajuste: semestral\nAceita animal de estimação\nWi-Fi e luz: por conta do inquilino.\n\nLocalização\nNa Thames 400, Villa Crespo, em uma zona estratégica de Buenos Aires, cercada de comércios, supermercados, restaurantes e serviços.\n\nA localização permite chegar facilmente a Palermo, Villa Crespo e ao centro da cidade, sendo uma opção prática para quem busca comodidade e boa conectividade.\n\nDisponibilidade\nDisponível para visitas.\n\nSe você procura um apartamento de 2 ambientes em Villa Crespo, fale conosco para consultar disponibilidade, condições e agendar uma visita.\n\nLIMA INMOBILIARIA", "properties.vc400.price": "ARS 750.000"});
    Object.assign(translations.en, {"properties.vc400.title": "2-Room Apartment in Villa Crespo", "properties.vc400.modalTitle": "2-Room Apartment in Villa Crespo – Temporary Rental", "properties.vc400.location": "Thames 400 - Villa Crespo", "properties.vc400.desc": "2 ROOMS IN VILLA CRESPO – TEMPORARY RENTAL\n\n📍 Thames 400, Villa Crespo – Buenos Aires City\n\nSpacious, functional 2-room apartment in an excellent area of Villa Crespo, with very good connections to Palermo and downtown Buenos Aires.\n\nThe property offers comfortable, bright spaces and is a good option for one person or a couple looking to settle in and live comfortably in the city.\n\nApartment features\n- 2 spacious rooms\n- 1 full bathroom\n- Very good natural light\n- Small pets allowed\n- Can be rented with or without a bed\n- Excellent location\n\nRent and conditions\nMonthly rent: ARS 750,000\nThe price includes electricity and gas consumption caps.\nContract: 1 year\nRent adjustment: every 6 months\nPets accepted\nWi-Fi and electricity: paid by the tenant.\n\nLocation\nOn Thames 400, Villa Crespo, in a strategic area of Buenos Aires, surrounded by shops, supermarkets, restaurants and services.\n\nThe location makes it easy to get to Palermo, Villa Crespo and downtown, making it a practical choice for those who want comfort and good connectivity.\n\nAvailability\nAvailable for viewings.\n\nIf you are looking for a 2-room apartment in Villa Crespo, contact us to ask about availability and conditions and to schedule a visit.\n\nLIMA INMOBILIARIA", "properties.vc400.price": "ARS 750,000"});

    Object.assign(translations.es, {"properties.lh2900.title": "Departamento 3 Ambientes en Palermo Chico", "properties.lh2900.modalTitle": "3 Ambientes en Palermo Chico – Alquiler Temporario", "properties.lh2900.location": "Av. Las Heras 2900 - Palermo Chico", "properties.lh2900.desc": "3 AMBIENTES EN PALERMO CHICO – ALQUILER TEMPORARIO\n\n📍 Av. Las Heras al 2900 – Palermo Chico, Ciudad de Buenos Aires\n\nU$S 1.750 mensuales – ALL INCLUSIVE\n\nImpecable departamento de 3 ambientes, totalmente amoblado y equipado, ubicado en una de las zonas más exclusivas y buscadas de Buenos Aires.\n\nCon 70 m² cubiertos + 5 m² de balcón, la propiedad ofrece ambientes amplios, luminosos y funcionales, junto con una excelente vista abierta y panorámica.\n\nUbicado al contrafrente, el departamento combina tranquilidad, privacidad y luminosidad, en un entorno residencial premium dentro del circuito de embajadas y próximo a importantes espacios verdes.\n\nCaracterísticas del departamento\n- 3 ambientes\n- 70 m² + 5 m² de balcón\n- 2 dormitorios\n- 1 baño completo\n- Balcón con vista panorámica y abierta\n- Totalmente amoblado y equipado\n- Aire acondicionado frío/calor\n- Lavarropas propio\n- Smart TV\n- Contrato de 6 meses a 1 año\n\nLiving comedor\nAmplio y luminoso living comedor con salida al balcón a través de un gran ventanal. Cuenta con sofá, sillón individual, Smart TV y comedor con capacidad para 6 personas.\nDispone además de aire acondicionado frío/calor.\n\nCocina\nCocina integrada mediante barra desayunadora, completamente equipada con electrodomésticos y todo lo necesario para una estadía confortable.\nCuenta también con lavarropas automático propio.\n\nDormitorios\nEl dormitorio principal dispone de cama king size, Smart TV, aire acondicionado frío/calor, ventilador de techo y amplio placard empotrado de piso a techo con puertas espejadas.\nEl segundo dormitorio ofrece gran versatilidad y puede adaptarse según las necesidades del huésped, con posibilidad de incorporar una o dos camas adicionales o utilizarse como espacio de trabajo. También cuenta con excelentes espacios de guardado.\n\nBaño\nBaño completo revestido en cerámicos símil mármol, equipado con bañera y mampara de vidrio.\n\nUbicación premium\nLa propiedad se encuentra en Palermo Chico, en un entorno residencial de categoría y con excelente conectividad.\n- A 150 m de Av. del Libertador\n- A 300 m de Av. Coronel Díaz\n- A metros de Parque Las Heras\n- Próximo al Parque República de Chile\n- Cercano a restaurantes, cafés y comercios\n- Excelente conexión con diferentes puntos de la ciudad\n\nCondiciones\nAlquiler mensual: U$S 1.750 ALL INCLUSIVE\nPeríodo de alquiler: 6 meses a 1 año.\nEl formato ALL INCLUSIVE ofrece una solución práctica para quienes buscan instalarse temporalmente en Buenos Aires con mayor previsibilidad de gastos.\n\nUna propiedad ideal para quienes buscan categoría, amplitud, luminosidad, tranquilidad y una ubicación premium en Palermo Chico, completamente equipada y lista para disfrutar.\n\nConsultá disponibilidad y condiciones de alquiler con LIMA INMOBILIARIA.", "properties.lh2900.price": "USD 1.750", "price.monthAI": "/ mes · all inclusive"});
    Object.assign(translations.pt, {"properties.lh2900.title": "Apartamento 3 Ambientes em Palermo Chico", "properties.lh2900.modalTitle": "3 Ambientes em Palermo Chico – Aluguel Temporário", "properties.lh2900.location": "Av. Las Heras 2900 - Palermo Chico", "properties.lh2900.desc": "3 AMBIENTES EM PALERMO CHICO – ALUGUEL TEMPORÁRIO\n\n📍 Av. Las Heras 2900 – Palermo Chico, Cidade de Buenos Aires\n\nU$S 1.750 mensais – ALL INCLUSIVE\n\nImpecável apartamento de 3 ambientes, totalmente mobiliado e equipado, localizado em uma das regiões mais exclusivas e procuradas de Buenos Aires.\n\nCom 70 m² cobertos + 5 m² de sacada, o imóvel oferece ambientes amplos, iluminados e funcionais, além de uma excelente vista aberta e panorâmica.\n\nVoltado para os fundos, o apartamento combina tranquilidade, privacidade e luminosidade, em um ambiente residencial premium dentro do circuito de embaixadas e perto de importantes espaços verdes.\n\nCaracterísticas do apartamento\n- 3 ambientes\n- 70 m² + 5 m² de sacada\n- 2 quartos\n- 1 banheiro completo\n- Sacada com vista panorâmica e aberta\n- Totalmente mobiliado e equipado\n- Ar-condicionado quente/frio\n- Máquina de lavar própria\n- Smart TV\n- Contrato de 6 meses a 1 ano\n\nSala de estar e jantar\nSala ampla e iluminada, com saída para a sacada por uma grande janela. Conta com sofá, poltrona, Smart TV e mesa de jantar para 6 pessoas.\nTambém tem ar-condicionado quente/frio.\n\nCozinha\nCozinha integrada por um balcão de café da manhã, totalmente equipada com eletrodomésticos e tudo o que é necessário para uma estadia confortável.\nTem também máquina de lavar automática própria.\n\nQuartos\nO quarto principal tem cama king size, Smart TV, ar-condicionado quente/frio, ventilador de teto e amplo armário embutido do piso ao teto com portas espelhadas.\nO segundo quarto oferece grande versatilidade e pode ser adaptado conforme a necessidade do hóspede, com possibilidade de incluir uma ou duas camas adicionais ou ser usado como espaço de trabalho. Também tem ótimos espaços de armazenamento.\n\nBanheiro\nBanheiro completo revestido em cerâmica com aspecto de mármore, equipado com banheira e box de vidro.\n\nLocalização premium\nO imóvel fica em Palermo Chico, em um ambiente residencial de categoria e com excelente conectividade.\n- A 150 m da Av. del Libertador\n- A 300 m da Av. Coronel Díaz\n- A poucos metros do Parque Las Heras\n- Perto do Parque República de Chile\n- Próximo a restaurantes, cafés e comércios\n- Excelente conexão com diferentes pontos da cidade\n\nCondições\nAluguel mensal: U$S 1.750 ALL INCLUSIVE\nPeríodo de aluguel: 6 meses a 1 ano.\nO formato ALL INCLUSIVE é uma solução prática para quem busca se instalar temporariamente em Buenos Aires com mais previsibilidade de gastos.\n\nUm imóvel ideal para quem busca categoria, amplitude, luminosidade, tranquilidade e localização premium em Palermo Chico, totalmente equipado e pronto para aproveitar.\n\nConsulte disponibilidade e condições de aluguel com a LIMA INMOBILIARIA.", "properties.lh2900.price": "USD 1.750", "price.monthAI": "/ mês · all inclusive"});
    Object.assign(translations.en, {"properties.lh2900.title": "3-Room Apartment in Palermo Chico", "properties.lh2900.modalTitle": "3-Room Apartment in Palermo Chico – Temporary Rental", "properties.lh2900.location": "Av. Las Heras 2900 - Palermo Chico", "properties.lh2900.desc": "3 ROOMS IN PALERMO CHICO – TEMPORARY RENTAL\n\n📍 Av. Las Heras 2900 – Palermo Chico, Buenos Aires City\n\nUSD 1,750 per month – ALL INCLUSIVE\n\nImmaculate 3-room apartment, fully furnished and equipped, in one of the most exclusive and sought-after areas of Buenos Aires.\n\nWith 70 m² indoors + 5 m² balcony, the property offers spacious, bright and functional rooms, along with an excellent open, panoramic view.\n\nFacing the back of the building, the apartment combines quiet, privacy and natural light, in a premium residential setting within the embassy district and close to major green spaces.\n\nApartment features\n- 3 rooms\n- 70 m² + 5 m² balcony\n- 2 bedrooms\n- 1 full bathroom\n- Balcony with open panoramic view\n- Fully furnished and equipped\n- Hot/cold air conditioning\n- Own washing machine\n- Smart TV\n- 6-month to 1-year contract\n\nLiving and dining room\nSpacious, bright living and dining room with access to the balcony through a large window. It has a sofa, an armchair, a Smart TV and a dining table that seats 6.\nIt also has hot/cold air conditioning.\n\nKitchen\nKitchen open to the living area through a breakfast bar, fully equipped with appliances and everything needed for a comfortable stay.\nIt also has its own automatic washing machine.\n\nBedrooms\nThe main bedroom has a king-size bed, Smart TV, hot/cold air conditioning, a ceiling fan and a large floor-to-ceiling built-in wardrobe with mirrored doors.\nThe second bedroom is very versatile and can be adapted to the guest's needs, with room for one or two extra beds or use as a workspace. It also has excellent storage.\n\nBathroom\nFull bathroom with marble-look ceramic tiles, equipped with a bathtub and glass screen.\n\nPremium location\nThe property is in Palermo Chico, in a high-end residential setting with excellent connectivity.\n- 150 m from Av. del Libertador\n- 300 m from Av. Coronel Díaz\n- Steps from Parque Las Heras\n- Close to Parque República de Chile\n- Near restaurants, cafés and shops\n- Excellent connections to different parts of the city\n\nConditions\nMonthly rent: USD 1,750 ALL INCLUSIVE\nRental period: 6 months to 1 year.\nThe ALL INCLUSIVE format is a practical solution for those who want to settle temporarily in Buenos Aires with more predictable expenses.\n\nAn ideal property for those looking for quality, space, natural light, quiet and a premium location in Palermo Chico, fully equipped and ready to enjoy.\n\nAsk about availability and rental conditions with LIMA INMOBILIARIA.", "properties.lh2900.price": "USD 1,750", "price.monthAI": "/ month · all inclusive"});

    Object.assign(translations.es, {"properties.th9.title": "Departamento 3 Ambientes en Villa Crespo", "properties.th9.modalTitle": "3 Ambientes en Villa Crespo – Alquiler Temporario", "properties.th9.location": "Thames 400, 9° piso - Villa Crespo", "properties.th9.desc": "3 AMBIENTES EN VILLA CRESPO – ALQUILER TEMPORARIO\n\n📍 Thames 400, 9° piso – Villa Crespo, Ciudad de Buenos Aires\n\nDisponible\n\nDepartamento de 3 ambientes ubicado en una de las zonas más buscadas de Villa Crespo. Por su distribución y ubicación, resulta una excelente opción para dos personas que buscan comodidad, buena conectividad y acceso a una amplia variedad de servicios.\n\nLa propiedad se encuentra en un piso alto y cuenta con una ubicación estratégica, próxima a Avenida Corrientes y a la Línea B de subte, con fácil conexión hacia Palermo, el centro y otros puntos de la ciudad.\n\nCaracterísticas del departamento\n- 3 ambientes\n- Ideal para 2 personas\n- Piso 9\n- Contrato semestral\n- Reajuste semestral\n- Apto mascotas\n- Excelente ubicación\n\nValor y condiciones\nAlquiler mensual: $900.000\nServicios a cargo del inquilino: WiFi, luz y gas\n\nUbicación\nVilla Crespo se caracteriza por combinar la tranquilidad de un barrio residencial con una amplia oferta comercial, gastronómica y cultural.\n\nEl departamento se encuentra a pocas cuadras de Av. Corrientes y la Línea B de subte, con numerosas líneas de colectivo y excelente conexión hacia Palermo y el centro de Buenos Aires.\n\nEn los alrededores se encuentran cafés, restaurantes, bares, supermercados, comercios y locales de diseño, además del polo gastronómico y comercial de Villa Crespo.\n\nDisponibilidad\nDisponible para visitar.\n\nUna excelente alternativa para quienes buscan un departamento de 3 ambientes en Villa Crespo, con contrato semestral, buena conectividad y posibilidad de vivir con mascotas.\n\nConsultá disponibilidad y condiciones de alquiler con LIMA INMOBILIARIA.", "properties.th9.price": "$900.000"});
    Object.assign(translations.pt, {"properties.th9.title": "Apartamento 3 Ambientes em Villa Crespo", "properties.th9.modalTitle": "3 Ambientes em Villa Crespo – Aluguel Temporário", "properties.th9.location": "Thames 400, 9° piso - Villa Crespo", "properties.th9.desc": "3 AMBIENTES EM VILLA CRESPO – ALUGUEL TEMPORÁRIO\n\n📍 Thames 400, 9º andar – Villa Crespo, Cidade de Buenos Aires\n\nDisponível\n\nApartamento de 3 ambientes localizado em uma das regiões mais procuradas de Villa Crespo. Pela distribuição e localização, é uma excelente opção para duas pessoas que buscam conforto, boa conectividade e acesso a uma grande variedade de serviços.\n\nO imóvel fica em andar alto e tem localização estratégica, perto da Avenida Corrientes e da Linha B do metrô, com fácil conexão com Palermo, o centro e outros pontos da cidade.\n\nCaracterísticas do apartamento\n- 3 ambientes\n- Ideal para 2 pessoas\n- 9º andar\n- Contrato semestral\n- Reajuste semestral\n- Aceita animais de estimação\n- Excelente localização\n\nValor e condições\nAluguel mensal: ARS 900.000\nPor conta do inquilino: WiFi, luz e gás\n\nLocalização\nVilla Crespo combina a tranquilidade de um bairro residencial com ampla oferta comercial, gastronômica e cultural.\n\nO apartamento fica a poucas quadras da Av. Corrientes e da Linha B do metrô, com várias linhas de ônibus e excelente conexão com Palermo e o centro de Buenos Aires.\n\nNos arredores há cafés, restaurantes, bares, supermercados, comércios e lojas de design, além do polo gastronômico e comercial de Villa Crespo.\n\nDisponibilidade\nDisponível para visitas.\n\nUma excelente alternativa para quem busca um apartamento de 3 ambientes em Villa Crespo, com contrato semestral, boa conectividade e possibilidade de morar com animais de estimação.\n\nConsulte disponibilidade e condições de aluguel com a LIMA INMOBILIARIA.", "properties.th9.price": "ARS 900.000"});
    Object.assign(translations.en, {"properties.th9.title": "3-Room Apartment in Villa Crespo", "properties.th9.modalTitle": "3-Room Apartment in Villa Crespo – Temporary Rental", "properties.th9.location": "Thames 400, 9° piso - Villa Crespo", "properties.th9.desc": "3 ROOMS IN VILLA CRESPO – TEMPORARY RENTAL\n\n📍 Thames 400, 9th floor – Villa Crespo, Buenos Aires City\n\nAvailable\n\n3-room apartment in one of the most sought-after areas of Villa Crespo. Thanks to its layout and location, it is an excellent option for two people who want comfort, good connectivity and access to a wide variety of services.\n\nThe property is on a high floor with a strategic location, close to Avenida Corrientes and Subway Line B, with easy connections to Palermo, downtown and other parts of the city.\n\nApartment features\n- 3 rooms\n- Ideal for 2 people\n- 9th floor\n- 6-month contract\n- Rent adjustment every 6 months\n- Pet friendly\n- Excellent location\n\nRent and conditions\nMonthly rent: ARS 900,000\nTenant pays: WiFi, electricity and gas\n\nLocation\nVilla Crespo combines the calm of a residential neighborhood with a wide range of shops, restaurants and cultural options.\n\nThe apartment is a few blocks from Av. Corrientes and Subway Line B, with many bus lines and excellent connections to Palermo and downtown Buenos Aires.\n\nNearby you will find cafés, restaurants, bars, supermarkets, shops and design stores, as well as Villa Crespo's dining and shopping district.\n\nAvailability\nAvailable for viewings.\n\nAn excellent alternative for those looking for a 3-room apartment in Villa Crespo, with a 6-month contract, good connectivity and the possibility of living with pets.\n\nAsk about availability and rental conditions with LIMA INMOBILIARIA.", "properties.th9.price": "ARS 900,000"});

    Object.assign(translations.es, {"properties.cb.title": "Monoambiente en Congreso / Balvanera", "properties.cb.modalTitle": "Monoambiente en Congreso / Balvanera – Alquiler Temporario", "properties.cb.location": "Callao y Perón - Congreso / Balvanera", "properties.cb.desc": "MONOAMBIENTE EN CONGRESO / BALVANERA – ALQUILER TEMPORARIO\n\n📍 Callao y Perón – Congreso / Balvanera, Ciudad de Buenos Aires\n\nDisponible – $780.000 mensuales\n\n1 ambiente de 30 m² ubicado en un 13° piso, con balcón y vista abierta, ideal para 1 o 2 personas que buscan una propiedad funcional, cómoda y bien conectada para una estadía temporaria en Buenos Aires.\n\nLa unidad se encuentra amoblada y equipada, ofreciendo todo lo necesario para una estadía práctica.\n\nCaracterísticas del departamento\n- Monoambiente\n- 30 m²\n- 13° piso\n- Capacidad para 2 personas\n- Cama doble\n- Balcón\n- Vista abierta\n- Aire acondicionado frío\n- Calefacción central\n- Seguridad 24 horas\n- Anafe eléctrico\n- Microondas\n- Heladera bajo mesada\n\nValor y condiciones\nAlquiler mensual: $780.000\nContrato: trimestral, con posibilidad de renovación.\nServicios a cargo del inquilino: electricidad, agua e internet.\n\nUbicación\nEl departamento se encuentra en la zona de Callao y Perón, en el área de Congreso/Balvanera, con excelente acceso al transporte público y conexión con distintos puntos de la Ciudad de Buenos Aires.\n\nSu ubicación resulta especialmente conveniente para estudiantes, profesionales y personas que necesitan instalarse temporalmente en Buenos Aires, con comercios, servicios y transporte en los alrededores.\n\nDisponibilidad\nDisponible para alquiler temporario.\n\nUna alternativa práctica para quienes buscan un monoambiente con balcón en Congreso/Balvanera, en un piso alto, con seguridad 24 horas y contrato trimestral renovable.\n\nConsultá disponibilidad y condiciones de alquiler con LIMA INMOBILIARIA.", "properties.cb.price": "$780.000"});
    Object.assign(translations.pt, {"properties.cb.title": "Studio (monoambiente) em Congreso / Balvanera", "properties.cb.modalTitle": "Studio em Congreso / Balvanera – Aluguel Temporário", "properties.cb.location": "Callao y Perón - Congreso / Balvanera", "properties.cb.desc": "STUDIO (MONOAMBIENTE) EM CONGRESO / BALVANERA – ALUGUEL TEMPORÁRIO\n\n📍 Callao e Perón – Congreso / Balvanera, Cidade de Buenos Aires\n\nDisponível – ARS 780.000 mensais\n\nStudio de 30 m² no 13º andar, com sacada e vista aberta, ideal para 1 ou 2 pessoas que buscam um imóvel funcional, confortável e bem conectado para uma estadia temporária em Buenos Aires.\n\nA unidade é mobiliada e equipada, com tudo o que é necessário para uma estadia prática.\n\nCaracterísticas do apartamento\n- Studio (monoambiente)\n- 30 m²\n- 13º andar\n- Capacidade para 2 pessoas\n- Cama de casal\n- Sacada\n- Vista aberta\n- Ar-condicionado só frio\n- Aquecimento central\n- Segurança 24 horas\n- Cooktop elétrico\n- Micro-ondas\n- Geladeira embutida sob a bancada\n\nValor e condições\nAluguel mensal: ARS 780.000\nContrato: trimestral, com possibilidade de renovação.\nPor conta do inquilino: eletricidade, água e internet.\n\nLocalização\nO apartamento fica na região de Callao e Perón, na área de Congreso/Balvanera, com excelente acesso ao transporte público e conexão com diferentes pontos da Cidade de Buenos Aires.\n\nA localização é especialmente conveniente para estudantes, profissionais e pessoas que precisam se instalar temporariamente em Buenos Aires, com comércios, serviços e transporte nos arredores.\n\nDisponibilidade\nDisponível para aluguel temporário.\n\nUma alternativa prática para quem busca um studio com sacada em Congreso/Balvanera, em andar alto, com segurança 24 horas e contrato trimestral renovável.\n\nConsulte disponibilidade e condições de aluguel com a LIMA INMOBILIARIA.", "properties.cb.price": "ARS 780.000"});
    Object.assign(translations.en, {"properties.cb.title": "Studio Apartment in Congreso / Balvanera", "properties.cb.modalTitle": "Studio Apartment in Congreso / Balvanera – Temporary Rental", "properties.cb.location": "Callao y Perón - Congreso / Balvanera", "properties.cb.desc": "STUDIO APARTMENT IN CONGRESO / BALVANERA – TEMPORARY RENTAL\n\n📍 Callao and Perón – Congreso / Balvanera, Buenos Aires City\n\nAvailable – ARS 780,000 per month\n\n30 m² studio on the 13th floor, with a balcony and open view, ideal for 1 or 2 people looking for a functional, comfortable and well-connected place for a temporary stay in Buenos Aires.\n\nThe unit is furnished and equipped, with everything needed for a practical stay.\n\nApartment features\n- Studio\n- 30 m²\n- 13th floor\n- Sleeps 2\n- Double bed\n- Balcony\n- Open view\n- Cooling-only air conditioning\n- Central heating\n- 24-hour security\n- Electric hob\n- Microwave\n- Under-counter fridge\n\nRent and conditions\nMonthly rent: ARS 780,000\nContract: 3 months, renewable.\nTenant pays: electricity, water and internet.\n\nLocation\nThe apartment is in the Callao and Perón area, in Congreso/Balvanera, with excellent access to public transport and connections to different parts of Buenos Aires City.\n\nThe location is especially convenient for students, professionals and people who need to settle temporarily in Buenos Aires, with shops, services and transport nearby.\n\nAvailability\nAvailable for temporary rental.\n\nA practical option for those looking for a studio with a balcony in Congreso/Balvanera, on a high floor, with 24-hour security and a renewable 3-month contract.\n\nAsk about availability and rental conditions with LIMA INMOBILIARIA.", "properties.cb.price": "ARS 780,000"});

    Object.assign(translations.es, {"properties.sc.title": "Monoambiente Divisible en San Cristóbal", "properties.sc.modalTitle": "Monoambiente Divisible en San Cristóbal – Alquiler Temporario", "properties.sc.location": "Salta 500 - San Cristóbal", "properties.sc.desc": "MONOAMBIENTE DIVISIBLE EN SAN CRISTÓBAL – ALQUILER TEMPORARIO\n\n📍 Salta al 500 – San Cristóbal, Ciudad de Buenos Aires\n\nDisponible desde el 10 de noviembre de 2026\n\n$700.000 mensuales\n\nAmplio y funcional 1 ambiente divisible de 36 m², ubicado en San Cristóbal, en una zona estratégica de Buenos Aires y con excelente conexión hacia distintos puntos de la ciudad.\n\nLa propiedad se encuentra amoblada y equipada, ofreciendo un espacio práctico y confortable para una estadía temporaria. Cuenta con balcón al contrafrente, proporcionando mayor tranquilidad y privacidad.\n\nCaracterísticas del departamento\n- Monoambiente divisible\n- 36 m² totales\n- Balcón al contrafrente\n- Vista interna y entorno tranquilo\n- Amoblado y equipado\n- Cocina completa con horno\n- Sofá\n- Mesa de centro\n- TV LCD de 32\"\n- Excelente distribución\n\nAmenities del edificio\nEl edificio ofrece servicios y espacios comunes pensados para mejorar la experiencia de los residentes:\n- Jacuzzi\n- Parrilla\n- Laundry\n\nValor y gastos\nAlquiler mensual: $700.000\nIncluye:\n- Expensas, con tope\n- ABL, con tope\nA cargo del inquilino:\n- Electricidad\n- Gas\n- Internet\n- Excedente de expensas sobre el tope establecido\n\nUbicación\nUbicado sobre Salta al 500, San Cristóbal, en una zona con buena conectividad, comercios, servicios y acceso a diferentes medios de transporte.\n\nSu ubicación resulta especialmente conveniente para estudiantes, profesionales y personas que necesitan residir temporalmente en Buenos Aires, con fácil acceso a distintos puntos de la ciudad.\n\nDisponibilidad\nDisponible a partir del 10 de noviembre de 2026.\n\nUna excelente opción para quienes buscan un monoambiente divisible en alquiler temporario en San Cristóbal, amoblado y equipado, con balcón, amenities y un entorno tranquilo.\n\nConsultá disponibilidad y condiciones de alquiler con LIMA INMOBILIARIA.", "properties.sc.price": "$700.000", "properties.sc.avail": "Disponible desde el 10 de nov. de 2026"});
    Object.assign(translations.pt, {"properties.sc.title": "Studio Divisível em San Cristóbal", "properties.sc.modalTitle": "Studio Divisível em San Cristóbal – Aluguel Temporário", "properties.sc.location": "Salta 500 - San Cristóbal", "properties.sc.desc": "STUDIO DIVISÍVEL EM SAN CRISTÓBAL – ALUGUEL TEMPORÁRIO\n\n📍 Salta 500 – San Cristóbal, Cidade de Buenos Aires\n\nDisponível a partir de 10 de novembro de 2026\n\nARS 700.000 mensais\n\nStudio amplo e funcional de 36 m², divisível em ambientes, localizado em San Cristóbal, em uma zona estratégica de Buenos Aires e com excelente conexão com diferentes pontos da cidade.\n\nO imóvel é mobiliado e equipado, oferecendo um espaço prático e confortável para uma estadia temporária. Tem sacada voltada para os fundos, o que proporciona mais tranquilidade e privacidade.\n\nCaracterísticas do apartamento\n- Studio divisível\n- 36 m² no total\n- Sacada voltada para os fundos\n- Vista interna e entorno tranquilo\n- Mobiliado e equipado\n- Cozinha completa com forno\n- Sofá\n- Mesa de centro\n- TV LCD de 32\"\n- Excelente distribuição\n\nComodidades do edifício\nO edifício oferece serviços e áreas comuns pensados para melhorar a experiência dos moradores:\n- Jacuzzi\n- Churrasqueira\n- Lavanderia\n\nValor e despesas\nAluguel mensal: ARS 700.000\nInclui:\n- Expensas (condomínio), até um limite\n- ABL (IPTU), até um limite\nPor conta do inquilino:\n- Eletricidade\n- Gás\n- Internet\n- Excedente das expensas acima do limite estabelecido\n\nLocalização\nNa Salta 500, San Cristóbal, em uma zona com boa conectividade, comércios, serviços e acesso a diferentes meios de transporte.\n\nA localização é especialmente conveniente para estudantes, profissionais e pessoas que precisam morar temporariamente em Buenos Aires, com fácil acesso a diferentes pontos da cidade.\n\nDisponibilidade\nDisponível a partir de 10 de novembro de 2026.\n\nUma excelente opção para quem busca um studio divisível em aluguel temporário em San Cristóbal, mobiliado e equipado, com sacada, comodidades no edifício e um entorno tranquilo.\n\nConsulte disponibilidade e condições de aluguel com a LIMA INMOBILIARIA.", "properties.sc.price": "ARS 700.000", "properties.sc.avail": "Disponível a partir de 10 de nov. de 2026"});
    Object.assign(translations.en, {"properties.sc.title": "Divisible Studio in San Cristóbal", "properties.sc.modalTitle": "Divisible Studio in San Cristóbal – Temporary Rental", "properties.sc.location": "Salta 500 - San Cristóbal", "properties.sc.desc": "DIVISIBLE STUDIO IN SAN CRISTÓBAL – TEMPORARY RENTAL\n\n📍 Salta 500 – San Cristóbal, Buenos Aires City\n\nAvailable from November 10, 2026\n\nARS 700,000 per month\n\nSpacious, functional 36 m² studio that can be divided into separate areas, in San Cristóbal, a strategic area of Buenos Aires with excellent connections to different parts of the city.\n\nThe property is furnished and equipped, offering a practical, comfortable space for a temporary stay. It has a balcony at the back of the building, providing more quiet and privacy.\n\nApartment features\n- Divisible studio\n- 36 m² total\n- Balcony at the back of the building\n- Inner view and quiet surroundings\n- Furnished and equipped\n- Full kitchen with oven\n- Sofa\n- Coffee table\n- 32\" LCD TV\n- Excellent layout\n\nBuilding amenities\nThe building offers services and shared spaces designed to improve residents' experience:\n- Jacuzzi\n- Barbecue grill\n- Laundry\n\nRent and expenses\nMonthly rent: ARS 700,000\nIncluded:\n- Expensas (building fees), up to a cap\n- ABL (property tax), up to a cap\nPaid by the tenant:\n- Electricity\n- Gas\n- Internet\n- Any expensas above the established cap\n\nLocation\nOn Salta 500, San Cristóbal, in an area with good connectivity, shops, services and access to different means of transport.\n\nThe location is especially convenient for students, professionals and people who need to live temporarily in Buenos Aires, with easy access to different parts of the city.\n\nAvailability\nAvailable from November 10, 2026.\n\nAn excellent option for those looking for a divisible studio for temporary rental in San Cristóbal, furnished and equipped, with a balcony, amenities and a quiet environment.\n\nAsk about availability and rental conditions with LIMA INMOBILIARIA.", "properties.sc.price": "ARS 700,000", "properties.sc.avail": "Available from Nov 10, 2026"});

    Object.assign(translations.es, {"pet.ok": "🐾 Acepta mascotas", "pet.small": "🐾 Mascotas pequeñas"});
    Object.assign(translations.pt, {"pet.ok": "🐾 Aceita pets", "pet.small": "🐾 Pets pequenos"});
    Object.assign(translations.en, {"pet.ok": "🐾 Pets welcome", "pet.small": "🐾 Small pets welcome"});

    Object.assign(translations.es, {"properties.cab.title": "Departamento 4 Ambientes en Caballito", "properties.cab.modalTitle": "Alquiler Temporario – 4 Ambientes en Caballito", "properties.cab.location": "Campichuelo 200 - Caballito", "properties.cab.desc": "ALQUILER TEMPORARIO – 4 AMBIENTES EN CABALLITO\n\n📍 Campichuelo 200 – Caballito, Ciudad de Buenos Aires\n\nUSD 1.200 mensuales\n\nAmplio y cómodo departamento de 4 ambientes ubicado en Caballito, en un barrio residencial, tranquilo y con excelente conectividad.\n\nLa propiedad ofrece ambientes amplios y funcionales, siendo una excelente alternativa para familias, estudiantes o profesionales que buscan comodidad y una buena ubicación dentro de la Ciudad de Buenos Aires.\n\nCaracterísticas del departamento\n- 4 ambientes\n- Living comedor luminoso\n- Cocina independiente equipada\n- Espacio de guardado\n- Comedor diario\n- Dormitorios amplios\n- 2 baños completos\n- Ambientes funcionales\n- Buena ventilación\n- Listo para habitar\n\nValor y gastos\nAlquiler mensual: USD 1.200\nExpensas: $176.000 mensuales\nServicios a cargo del inquilino: luz y gas\n\nUbicación\nEl departamento se encuentra sobre Campichuelo al 200, Caballito, en una zona residencial y tranquila, con fácil acceso a comercios, servicios y transporte público.\n\nSe encuentra próximo a Parque Chacabuco, ofreciendo una ubicación práctica para quienes buscan combinar tranquilidad residencial con buena conexión hacia distintos puntos de Buenos Aires.\n\nDisponibilidad\nDepartamento listo para habitar.\n\nUna excelente opción para quienes buscan un departamento de 4 ambientes en alquiler en Caballito, con amplios espacios, 2 baños y una ubicación residencial bien conectada.\n\nConsultá disponibilidad, condiciones y coordiná una visita con LIMA INMOBILIARIA.", "properties.cab.price": "USD 1.200"});
    Object.assign(translations.pt, {"properties.cab.title": "Apartamento 4 Ambientes em Caballito", "properties.cab.modalTitle": "Aluguel Temporário – 4 Ambientes em Caballito", "properties.cab.location": "Campichuelo 200 - Caballito", "properties.cab.desc": "ALUGUEL TEMPORÁRIO – 4 AMBIENTES EM CABALLITO\n\n📍 Campichuelo 200 – Caballito, Cidade de Buenos Aires\n\nUSD 1.200 mensais\n\nApartamento amplo e confortável de 4 ambientes em Caballito, em um bairro residencial, tranquilo e com excelente conectividade.\n\nO imóvel oferece ambientes amplos e funcionais, sendo uma excelente alternativa para famílias, estudantes ou profissionais que buscam conforto e uma boa localização na Cidade de Buenos Aires.\n\nCaracterísticas do apartamento\n- 4 ambientes\n- Sala de estar e jantar iluminada\n- Cozinha independente equipada\n- Espaço de armazenamento\n- Copa (refeições do dia a dia)\n- Quartos amplos\n- 2 banheiros completos\n- Ambientes funcionais\n- Boa ventilação\n- Pronto para morar\n\nValor e despesas\nAluguel mensal: USD 1.200\nExpensas (condomínio): ARS 176.000 mensais\nPor conta do inquilino: luz e gás\n\nLocalização\nO apartamento fica na Campichuelo 200, Caballito, em uma zona residencial e tranquila, com fácil acesso a comércios, serviços e transporte público.\n\nFica perto do Parque Chacabuco, uma localização prática para quem busca combinar tranquilidade residencial com boa conexão com diferentes pontos de Buenos Aires.\n\nDisponibilidade\nApartamento pronto para morar.\n\nUma excelente opção para quem busca um apartamento de 4 ambientes para alugar em Caballito, com espaços amplos, 2 banheiros e uma localização residencial bem conectada.\n\nConsulte disponibilidade, condições e agende uma visita com a LIMA INMOBILIARIA.", "properties.cab.price": "USD 1.200"});
    Object.assign(translations.en, {"properties.cab.title": "4-Room Apartment in Caballito", "properties.cab.modalTitle": "Temporary Rental – 4-Room Apartment in Caballito", "properties.cab.location": "Campichuelo 200 - Caballito", "properties.cab.desc": "TEMPORARY RENTAL – 4-ROOM APARTMENT IN CABALLITO\n\n📍 Campichuelo 200 – Caballito, Buenos Aires City\n\nUSD 1,200 per month\n\nSpacious, comfortable 4-room apartment in Caballito, in a quiet residential neighborhood with excellent connectivity.\n\nThe property offers spacious, functional rooms, making it an excellent option for families, students or professionals looking for comfort and a good location in Buenos Aires City.\n\nApartment features\n- 4 rooms\n- Bright living and dining room\n- Separate equipped kitchen\n- Storage space\n- Everyday dining area\n- Spacious bedrooms\n- 2 full bathrooms\n- Functional rooms\n- Good ventilation\n- Move-in ready\n\nRent and expenses\nMonthly rent: USD 1,200\nExpensas (building fees): ARS 176,000 per month\nTenant pays: electricity and gas\n\nLocation\nThe apartment is on Campichuelo 200, Caballito, in a quiet residential area with easy access to shops, services and public transport.\n\nIt is close to Parque Chacabuco, a practical location for those who want to combine residential calm with good connections to different parts of Buenos Aires.\n\nAvailability\nMove-in ready.\n\nAn excellent option for those looking for a 4-room apartment to rent in Caballito, with large spaces, 2 bathrooms and a well-connected residential location.\n\nAsk about availability and conditions and arrange a visit with LIMA INMOBILIARIA.", "properties.cab.price": "USD 1,200"});

    Object.assign(translations.es, {"card.featured": "Destacado", "properties.badge.reserved": "Reservado"});
    Object.assign(translations.pt, {"card.featured": "Destaque", "properties.badge.reserved": "Reservado"});
    Object.assign(translations.en, {"card.featured": "Featured", "properties.badge.reserved": "Reserved"});

    Object.assign(translations.es, {"properties.tuc3100.title": "Departamento 2 Ambientes Amoblado en Almagro", "properties.tuc3100.modalTitle": "Alquiler de 2 Ambientes Amoblado en Almagro", "properties.tuc3100.location": "Tucumán 3100 - Almagro", "properties.tuc3100.desc": "ALQUILER DE 2 AMBIENTES AMOBLADO EN ALMAGRO\n\n📍 Tucumán 3100 – Almagro, Ciudad de Buenos Aires\n\nAlquiler mensual: USD 700\n\nDepartamento de 2 ambientes, cómodo, funcional y completamente amoblado, ideal para quienes buscan instalarse en Buenos Aires con practicidad y comodidad.\n\nLa propiedad cuenta con dormitorio independiente con cama matrimonial, living comedor, cocina equipada y baño completo. Sus ambientes ofrecen una distribución funcional para disfrutar de una estadía confortable, tanto por motivos laborales como académicos o personales.\n\nCaracterísticas del departamento\n- 2 ambientes\n- Dormitorio independiente con cama matrimonial\n- Living comedor\n- Cocina equipada\n- Baño completo\n- Completamente amoblado\n\nValor y gastos\nAlquiler mensual: USD 700\nServicios a cargo del inquilino:\n- Electricidad\n- Gas\n- Wi-Fi\n\nCondiciones de alquiler\nSe ofrecen distintas alternativas de contratación, según disponibilidad y condiciones acordadas:\n- Contrato de 3 meses\n- Contrato de 6 meses\n- Contrato de 1 año\n\nUbicación\nUbicado sobre Tucumán al 3100, en Almagro, en una zona con acceso a comercios, supermercados, restaurantes, cafés y transporte público.\n\nSu ubicación permite una buena conexión con distintos sectores de la Ciudad de Buenos Aires, como Palermo, Recoleta y Microcentro.\n\nDisponibilidad y consultas\nUna excelente alternativa para extranjeros, estudiantes, profesionales y parejas que buscan un departamento amoblado de 2 ambientes en alquiler en Almagro, con dormitorio independiente y diferentes opciones de contratación.\n\nContactá a LIMA INMOBILIARIA para consultar disponibilidad, condiciones y coordinar una visita.", "properties.tuc3100.price": "USD 700"});
    Object.assign(translations.pt, {"properties.tuc3100.title": "Apartamento 2 Ambientes Mobiliado em Almagro", "properties.tuc3100.modalTitle": "Aluguel de 2 Ambientes Mobiliado em Almagro", "properties.tuc3100.location": "Tucumán 3100 - Almagro", "properties.tuc3100.desc": "ALUGUEL DE 2 AMBIENTES MOBILIADO EM ALMAGRO\n\n📍 Tucumán 3100 – Almagro, Cidade de Buenos Aires\n\nAluguel mensal: USD 700\n\nApartamento de 2 ambientes, confortável, funcional e totalmente mobiliado, ideal para quem busca se instalar em Buenos Aires com praticidade e conforto.\n\nO imóvel tem quarto independente com cama de casal, sala de estar e jantar, cozinha equipada e banheiro completo. Os ambientes têm uma distribuição funcional para aproveitar uma estadia confortável, seja por motivos de trabalho, estudo ou pessoais.\n\nCaracterísticas do apartamento\n- 2 ambientes\n- Quarto independente com cama de casal\n- Sala de estar e jantar\n- Cozinha equipada\n- Banheiro completo\n- Totalmente mobiliado\n\nValor e despesas\nAluguel mensal: USD 700\nPor conta do inquilino:\n- Eletricidade\n- Gás\n- Wi-Fi\n\nCondições de aluguel\nSão oferecidas diferentes alternativas de contratação, conforme a disponibilidade e as condições combinadas:\n- Contrato de 3 meses\n- Contrato de 6 meses\n- Contrato de 1 ano\n\nLocalização\nNa Tucumán 3100, em Almagro, em uma zona com acesso a comércios, supermercados, restaurantes, cafés e transporte público.\n\nA localização permite uma boa conexão com diferentes regiões da Cidade de Buenos Aires, como Palermo, Recoleta e Microcentro.\n\nDisponibilidade e consultas\nUma excelente alternativa para estrangeiros, estudantes, profissionais e casais que buscam um apartamento mobiliado de 2 ambientes para alugar em Almagro, com quarto independente e diferentes opções de contratação.\n\nFale com a LIMA INMOBILIARIA para consultar disponibilidade, condições e agendar uma visita.", "properties.tuc3100.price": "USD 700"});
    Object.assign(translations.en, {"properties.tuc3100.title": "Furnished 2-Room Apartment in Almagro", "properties.tuc3100.modalTitle": "Furnished 2-Room Apartment for Rent in Almagro", "properties.tuc3100.location": "Tucumán 3100 - Almagro", "properties.tuc3100.desc": "FURNISHED 2-ROOM APARTMENT FOR RENT IN ALMAGRO\n\n📍 Tucumán 3100 – Almagro, Buenos Aires City\n\nMonthly rent: USD 700\n\nComfortable, functional, fully furnished 2-room apartment, ideal for those who want to settle in Buenos Aires with convenience and comfort.\n\nThe property has a separate bedroom with a double bed, a living and dining room, an equipped kitchen and a full bathroom. The rooms offer a functional layout for a comfortable stay, whether for work, study or personal reasons.\n\nApartment features\n- 2 rooms\n- Separate bedroom with double bed\n- Living and dining room\n- Equipped kitchen\n- Full bathroom\n- Fully furnished\n\nRent and expenses\nMonthly rent: USD 700\nTenant pays:\n- Electricity\n- Gas\n- Wi-Fi\n\nRental conditions\nDifferent contract options are offered, depending on availability and agreed conditions:\n- 3-month contract\n- 6-month contract\n- 1-year contract\n\nLocation\nOn Tucumán 3100, in Almagro, in an area with access to shops, supermarkets, restaurants, cafés and public transport.\n\nThe location offers good connections to different parts of Buenos Aires City, such as Palermo, Recoleta and Microcentro.\n\nAvailability and inquiries\nAn excellent option for foreigners, students, professionals and couples looking for a furnished 2-room apartment to rent in Almagro, with a separate bedroom and different contract options.\n\nContact LIMA INMOBILIARIA to ask about availability and conditions and to arrange a visit.", "properties.tuc3100.price": "USD 700"});

    Object.assign(translations.es, {"properties.fso2300.title": "Departamento 2 Ambientes Amoblado en Palermo", "properties.fso2300.modalTitle": "Alquiler de 2 Ambientes Amoblado en Palermo", "properties.fso2300.location": "Fray J. S. de Oro 2300 - Palermo", "properties.fso2300.desc": "ALQUILER DE 2 AMBIENTES AMOBLADO EN PALERMO\n\n📍 Fray J. S. de Oro al 2300 – Palermo, Ciudad de Buenos Aires\n\nAlquiler mensual: U$S 700 + luz y gas\n\nCómodo departamento de 2 ambientes, completamente amoblado y equipado, ubicado en Palermo, uno de los barrios más buscados de Buenos Aires.\n\nLa propiedad ofrece una distribución funcional y ambientes confortables, ideal para quienes buscan instalarse en la ciudad con practicidad, tanto por motivos académicos como laborales o personales.\n\nEl departamento cuenta con un dormitorio independiente con cama matrimonial y mesas de luz. El ambiente principal integra el espacio de estar con una cocina equipada, creando un entorno práctico para la vida cotidiana. Además, dispone de buena entrada de luz natural.\n\nCaracterísticas del departamento\n- 2 ambientes\n- Capacidad para hasta 3 personas\n- Amoblado y equipado\n- Dormitorio independiente\n- Cama matrimonial\n- Mesas de luz\n- Cocina equipada\n- Buena iluminación natural\n\nValor y gastos\nAlquiler mensual: U$S 700\nServicios a cargo del inquilino:\n- Electricidad\n- Gas\n\nCondiciones de alquiler\nSe ofrecen distintas alternativas de contratación, según disponibilidad y condiciones acordadas:\n- Contrato de 3 meses\n- Contrato de 6 meses\n- Contrato de 1 año fijo\n\nUbicación\nUbicado sobre Fray J. S. de Oro al 2300, en Palermo, en una zona reconocida por su amplia oferta gastronómica, comercial y de servicios, con acceso a medios de transporte y conexión con diferentes puntos de la ciudad.\n\nDisponibilidad y consultas\nUna excelente alternativa para estudiantes, profesionales, parejas o personas que buscan un departamento amoblado de 2 ambientes en alquiler en Palermo, con capacidad para hasta 3 personas y diferentes opciones de contratación.\n\nContactá a LIMA INMOBILIARIA para consultar disponibilidad, condiciones y coordinar una visita.", "properties.fso2300.price": "USD 700"});
    Object.assign(translations.pt, {"properties.fso2300.title": "Apartamento 2 Ambientes Mobiliado em Palermo", "properties.fso2300.modalTitle": "Aluguel de 2 Ambientes Mobiliado em Palermo", "properties.fso2300.location": "Fray J. S. de Oro 2300 - Palermo", "properties.fso2300.desc": "ALUGUEL DE 2 AMBIENTES MOBILIADO EM PALERMO\n\n📍 Fray J. S. de Oro 2300 – Palermo, Cidade de Buenos Aires\n\nAluguel mensal: U$S 700 + luz e gás\n\nApartamento confortável de 2 ambientes, totalmente mobiliado e equipado, em Palermo, um dos bairros mais procurados de Buenos Aires.\n\nO imóvel oferece uma distribuição funcional e ambientes confortáveis, ideal para quem busca se instalar na cidade com praticidade, seja por motivos acadêmicos, profissionais ou pessoais.\n\nO apartamento tem um quarto independente com cama de casal e criados-mudos. O ambiente principal integra a sala de estar com uma cozinha equipada, criando um espaço prático para o dia a dia. Além disso, tem boa entrada de luz natural.\n\nCaracterísticas do apartamento\n- 2 ambientes\n- Capacidade para até 3 pessoas\n- Mobiliado e equipado\n- Quarto independente\n- Cama de casal\n- Criados-mudos\n- Cozinha equipada\n- Boa iluminação natural\n\nValor e despesas\nAluguel mensal: U$S 700\nPor conta do inquilino:\n- Eletricidade\n- Gás\n\nCondições de aluguel\nSão oferecidas diferentes alternativas de contratação, conforme a disponibilidade e as condições combinadas:\n- Contrato de 3 meses\n- Contrato de 6 meses\n- Contrato de 1 ano fixo\n\nLocalização\nNa Fray J. S. de Oro 2300, em Palermo, em uma zona reconhecida pela ampla oferta gastronômica, comercial e de serviços, com acesso a transporte e conexão com diferentes pontos da cidade.\n\nDisponibilidade e consultas\nUma excelente alternativa para estudantes, profissionais, casais ou pessoas que buscam um apartamento mobiliado de 2 ambientes para alugar em Palermo, com capacidade para até 3 pessoas e diferentes opções de contratação.\n\nFale com a LIMA INMOBILIARIA para consultar disponibilidade, condições e agendar uma visita.", "properties.fso2300.price": "USD 700"});
    Object.assign(translations.en, {"properties.fso2300.title": "Furnished 2-Room Apartment in Palermo", "properties.fso2300.modalTitle": "Furnished 2-Room Apartment for Rent in Palermo", "properties.fso2300.location": "Fray J. S. de Oro 2300 - Palermo", "properties.fso2300.desc": "FURNISHED 2-ROOM APARTMENT FOR RENT IN PALERMO\n\n📍 Fray J. S. de Oro 2300 – Palermo, Buenos Aires City\n\nMonthly rent: USD 700 + electricity and gas\n\nComfortable 2-room apartment, fully furnished and equipped, in Palermo, one of the most sought-after neighborhoods in Buenos Aires.\n\nThe property offers a functional layout and comfortable rooms, ideal for those who want to settle in the city with convenience, whether for academic, work or personal reasons.\n\nThe apartment has a separate bedroom with a double bed and bedside tables. The main room combines the living area with an equipped kitchen, creating a practical space for everyday life. It also gets plenty of natural light.\n\nApartment features\n- 2 rooms\n- Sleeps up to 3 people\n- Furnished and equipped\n- Separate bedroom\n- Double bed\n- Bedside tables\n- Equipped kitchen\n- Good natural light\n\nRent and expenses\nMonthly rent: USD 700\nTenant pays:\n- Electricity\n- Gas\n\nRental conditions\nDifferent contract options are offered, depending on availability and agreed conditions:\n- 3-month contract\n- 6-month contract\n- Fixed 1-year contract\n\nLocation\nOn Fray J. S. de Oro 2300, in Palermo, in an area known for its wide range of restaurants, shops and services, with access to transport and connections to different parts of the city.\n\nAvailability and inquiries\nAn excellent option for students, professionals, couples or anyone looking for a furnished 2-room apartment to rent in Palermo, for up to 3 people and with different contract options.\n\nContact LIMA INMOBILIARIA to ask about availability and conditions and to arrange a visit.", "properties.fso2300.price": "USD 700"});

    Object.assign(translations.es, {"properties.bul2700.title": "Departamento 3 Ambientes con Amenities en Palermo Chico", "properties.bul2700.modalTitle": "Alquiler Temporario – 3 Ambientes en Palermo Chico", "properties.bul2700.location": "Bulnes 2700 - Palermo Chico", "properties.bul2700.desc": "ALQUILER TEMPORARIO – 3 AMBIENTES EN PALERMO CHICO\n\n📍 Bulnes al 2700 – Palermo Chico, Ciudad de Buenos Aires\n\nAlquiler mensual: U$S 1.300\n\nAmplio y luminoso departamento de 3 ambientes, ubicado en el quinto piso de un edificio con amenities premium, en una de las zonas residenciales más exclusivas de Buenos Aires.\n\nLa propiedad cuenta con dos dormitorios y capacidad para hasta 4 personas. Se encuentra amoblada y ofrece una alternativa confortable para quienes buscan una estadía prolongada, con espacios de recreación, seguridad y servicios dentro del edificio.\n\nCaracterísticas del departamento\n- 3 ambientes\n- 2 dormitorios\n- Capacidad para 4 personas\n- Ubicado en el piso 5\n- Amoblado y luminoso\n- No se aceptan mascotas\n\nAmenities y servicios del edificio\n- Pileta\n- Gimnasio\n- Cancha de tenis\n- Laundry\n- Seguridad presencial las 24 horas\n\nValor y gastos\nAlquiler mensual: U$S 1.300\nDepósito de garantía: U$S 1.500\nExpensas: $483.219 mensuales\nServicios a cargo del inquilino:\n- Electricidad\n- Gas\n- ABL\n- Wi-Fi\n\nCondiciones de alquiler\nContrato mínimo: 6 meses.\n\nUbicación\nUbicado sobre Bulnes al 2700, en Palermo Chico, en un entorno residencial que combina tranquilidad, servicios y buena conexión con diferentes sectores de la Ciudad de Buenos Aires.\n\nDisponibilidad y consultas\nUna excelente opción para familias, parejas o profesionales que buscan un departamento amoblado de 3 ambientes en alquiler temporario en Palermo Chico, con capacidad para 4 personas y acceso a amenities de primer nivel.\n\nContactá a LIMA INMOBILIARIA para consultar disponibilidad, condiciones de alquiler y coordinar una visita.", "properties.bul2700.price": "USD 1.300"});
    Object.assign(translations.pt, {"properties.bul2700.title": "Apartamento 3 Ambientes com Amenities em Palermo Chico", "properties.bul2700.modalTitle": "Aluguel Temporário – 3 Ambientes em Palermo Chico", "properties.bul2700.location": "Bulnes 2700 - Palermo Chico", "properties.bul2700.desc": "ALUGUEL TEMPORÁRIO – 3 AMBIENTES EM PALERMO CHICO\n\n📍 Bulnes 2700 – Palermo Chico, Cidade de Buenos Aires\n\nAluguel mensal: U$S 1.300\n\nApartamento amplo e iluminado de 3 ambientes, no quinto andar de um edifício com amenities premium, em uma das zonas residenciais mais exclusivas de Buenos Aires.\n\nO imóvel tem dois quartos e capacidade para até 4 pessoas. É mobiliado e oferece uma alternativa confortável para quem busca uma estadia prolongada, com áreas de lazer, segurança e serviços dentro do edifício.\n\nCaracterísticas do apartamento\n- 3 ambientes\n- 2 quartos\n- Capacidade para 4 pessoas\n- Localizado no 5º andar\n- Mobiliado e iluminado\n- Não aceita animais de estimação\n\nAmenities e serviços do edifício\n- Piscina\n- Academia\n- Quadra de tênis\n- Lavanderia\n- Segurança presencial 24 horas\n\nValor e despesas\nAluguel mensal: U$S 1.300\nDepósito de garantia: U$S 1.500\nExpensas (condomínio): ARS 483.219 mensais\nPor conta do inquilino:\n- Eletricidade\n- Gás\n- ABL (IPTU)\n- Wi-Fi\n\nCondições de aluguel\nContrato mínimo: 6 meses.\n\nLocalização\nNa Bulnes 2700, em Palermo Chico, em um ambiente residencial que combina tranquilidade, serviços e boa conexão com diferentes regiões da Cidade de Buenos Aires.\n\nDisponibilidade e consultas\nUma excelente opção para famílias, casais ou profissionais que buscam um apartamento mobiliado de 3 ambientes para aluguel temporário em Palermo Chico, com capacidade para 4 pessoas e acesso a amenities de primeiro nível.\n\nFale com a LIMA INMOBILIARIA para consultar disponibilidade, condições de aluguel e agendar uma visita.", "properties.bul2700.price": "USD 1.300"});
    Object.assign(translations.en, {"properties.bul2700.title": "3-Room Apartment with Amenities in Palermo Chico", "properties.bul2700.modalTitle": "Temporary Rental – 3-Room Apartment in Palermo Chico", "properties.bul2700.location": "Bulnes 2700 - Palermo Chico", "properties.bul2700.desc": "TEMPORARY RENTAL – 3-ROOM APARTMENT IN PALERMO CHICO\n\n📍 Bulnes 2700 – Palermo Chico, Buenos Aires City\n\nMonthly rent: USD 1,300\n\nSpacious, bright 3-room apartment on the fifth floor of a building with premium amenities, in one of the most exclusive residential areas of Buenos Aires.\n\nThe property has two bedrooms and sleeps up to 4 people. It is furnished and offers a comfortable option for those looking for a longer stay, with leisure areas, security and services inside the building.\n\nApartment features\n- 3 rooms\n- 2 bedrooms\n- Sleeps 4 people\n- 5th floor\n- Furnished and bright\n- No pets allowed\n\nBuilding amenities and services\n- Pool\n- Gym\n- Tennis court\n- Laundry\n- On-site security 24 hours\n\nRent and expenses\nMonthly rent: USD 1,300\nSecurity deposit: USD 1,500\nExpensas (building fees): ARS 483,219 per month\nTenant pays:\n- Electricity\n- Gas\n- ABL (property tax)\n- Wi-Fi\n\nRental conditions\nMinimum contract: 6 months.\n\nLocation\nOn Bulnes 2700, in Palermo Chico, in a residential setting that combines quiet, services and good connections to different parts of Buenos Aires City.\n\nAvailability and inquiries\nAn excellent option for families, couples or professionals looking for a furnished 3-room apartment for temporary rental in Palermo Chico, for 4 people and with access to top-level amenities.\n\nContact LIMA INMOBILIARIA to ask about availability and rental conditions and to arrange a visit.", "properties.bul2700.price": "USD 1,300"});

    Object.assign(translations.es, {"properties.hum2300.title": "Departamento 2 Ambientes con Piscina en Palermo", "properties.hum2300.modalTitle": "Alquiler Temporario – 2 Ambientes Amoblado en Palermo", "properties.hum2300.location": "Humboldt 2300 - Palermo", "properties.hum2300.desc": "ALQUILER TEMPORARIO – 2 AMBIENTES AMOBLADO EN PALERMO\n\n📍 Humboldt al 2300 – Palermo, Ciudad de Buenos Aires\n\nAlquiler mensual: $850.000\n\nDepartamento de 2 ambientes, amoblado y equipado, ubicado en Palermo, una de las zonas más buscadas de Buenos Aires. Una opción práctica para quienes desean instalarse en la ciudad con comodidad y acceso a los servicios del barrio.\n\nEl edificio cuenta con piscina y laundry, dos amenities que aportan comodidad y practicidad durante la estadía. Además, se aceptan mascotas, lo que permite considerar esta propiedad para quienes desean vivir con sus animales de compañía.\n\nCaracterísticas del departamento\n- 2 ambientes\n- Amoblado y equipado\n- Se aceptan mascotas\n- Disponible para ingreso inmediato\n\nAmenities del edificio\n- Piscina\n- Laundry\n\nValor y gastos\nAlquiler mensual: $850.000\nDepósito de garantía: $1.200.000\nExpensas: $366.000 mensuales\nServicios a cargo del inquilino:\n- Electricidad\n- Gas\n- ABL\n- Wi-Fi\n\nUbicación\nUbicado sobre Humboldt al 2300, en Palermo, en una zona con amplia oferta gastronómica, comercios, servicios y opciones de transporte público, ideal para quienes buscan disfrutar de la vida urbana de Buenos Aires.\n\nDisponibilidad\nDisponible para ingresar de inmediato.\n\nUna excelente alternativa para quienes buscan un departamento amoblado de 2 ambientes en alquiler temporario en Palermo, con piscina, laundry y posibilidad de vivir con mascotas.\n\nContactá a LIMA INMOBILIARIA para consultar las condiciones de alquiler y coordinar una visita.", "properties.hum2300.price": "$850.000", "properties.hum2300.avail": "Ingreso inmediato"});
    Object.assign(translations.pt, {"properties.hum2300.title": "Apartamento 2 Ambientes com Piscina em Palermo", "properties.hum2300.modalTitle": "Aluguel Temporário – 2 Ambientes Mobiliado em Palermo", "properties.hum2300.location": "Humboldt 2300 - Palermo", "properties.hum2300.desc": "ALUGUEL TEMPORÁRIO – 2 AMBIENTES MOBILIADO EM PALERMO\n\n📍 Humboldt 2300 – Palermo, Cidade de Buenos Aires\n\nAluguel mensal: ARS 850.000\n\nApartamento de 2 ambientes, mobiliado e equipado, em Palermo, uma das regiões mais procuradas de Buenos Aires. Uma opção prática para quem quer se instalar na cidade com conforto e acesso aos serviços do bairro.\n\nO edifício tem piscina e lavanderia, duas comodidades que trazem conforto e praticidade durante a estadia. Além disso, aceita animais de estimação, o que permite considerar este imóvel para quem quer morar com seus bichos.\n\nCaracterísticas do apartamento\n- 2 ambientes\n- Mobiliado e equipado\n- Aceita animais de estimação\n- Disponível para entrada imediata\n\nAmenities do edifício\n- Piscina\n- Lavanderia\n\nValor e despesas\nAluguel mensal: ARS 850.000\nDepósito de garantia: ARS 1.200.000\nExpensas (condomínio): ARS 366.000 mensais\nPor conta do inquilino:\n- Eletricidade\n- Gás\n- ABL (IPTU)\n- Wi-Fi\n\nLocalização\nNa Humboldt 2300, em Palermo, em uma zona com ampla oferta gastronômica, comércios, serviços e opções de transporte público, ideal para quem busca aproveitar a vida urbana de Buenos Aires.\n\nDisponibilidade\nDisponível para entrada imediata.\n\nUma excelente alternativa para quem busca um apartamento mobiliado de 2 ambientes para aluguel temporário em Palermo, com piscina, lavanderia e possibilidade de morar com animais de estimação.\n\nFale com a LIMA INMOBILIARIA para consultar as condições de aluguel e agendar uma visita.", "properties.hum2300.price": "ARS 850.000", "properties.hum2300.avail": "Entrada imediata"});
    Object.assign(translations.en, {"properties.hum2300.title": "2-Room Apartment with Pool in Palermo", "properties.hum2300.modalTitle": "Temporary Rental – Furnished 2-Room Apartment in Palermo", "properties.hum2300.location": "Humboldt 2300 - Palermo", "properties.hum2300.desc": "TEMPORARY RENTAL – FURNISHED 2-ROOM APARTMENT IN PALERMO\n\n📍 Humboldt 2300 – Palermo, Buenos Aires City\n\nMonthly rent: ARS 850,000\n\nFurnished and equipped 2-room apartment in Palermo, one of the most sought-after areas of Buenos Aires. A practical option for those who want to settle in the city with comfort and access to the neighborhood's services.\n\nThe building has a pool and laundry, two amenities that add comfort and convenience during your stay. Pets are also accepted, so this property can be considered by those who want to live with their companion animals.\n\nApartment features\n- 2 rooms\n- Furnished and equipped\n- Pets accepted\n- Available for immediate move-in\n\nBuilding amenities\n- Pool\n- Laundry\n\nRent and expenses\nMonthly rent: ARS 850,000\nSecurity deposit: ARS 1,200,000\nExpensas (building fees): ARS 366,000 per month\nTenant pays:\n- Electricity\n- Gas\n- ABL (property tax)\n- Wi-Fi\n\nLocation\nOn Humboldt 2300, in Palermo, in an area with a wide range of restaurants, shops, services and public transport, ideal for those who want to enjoy urban life in Buenos Aires.\n\nAvailability\nAvailable for immediate move-in.\n\nAn excellent option for those looking for a furnished 2-room apartment for temporary rental in Palermo, with a pool, laundry and the possibility of living with pets.\n\nContact LIMA INMOBILIARIA to ask about rental conditions and to arrange a visit.", "properties.hum2300.price": "ARS 850,000", "properties.hum2300.avail": "Immediate move-in"});

    Object.assign(translations.es, {"properties.mai500.title": "Departamento en el Centro de Buenos Aires", "properties.mai500.modalTitle": "Alquiler Temporario – Departamento en el Centro de Buenos Aires", "properties.mai500.location": "Maipú 500, 9° piso - Centro", "properties.mai500.desc": "ALQUILER TEMPORARIO – DEPARTAMENTO EN EL CENTRO DE BUENOS AIRES\n\n📍 Maipú 500, 9° piso, unidad G – Ciudad Autónoma de Buenos Aires\n\nAlquiler mensual: USD 600\n\nDepartamento ubicado en el centro de Buenos Aires, en una zona estratégica con excelente acceso al transporte público, comercios, servicios y diferentes puntos de la ciudad.\n\nLa propiedad tiene capacidad para hasta 3 personas y es una alternativa práctica para quienes buscan establecerse en Buenos Aires mediante un contrato de alquiler anual.\n\nCaracterísticas del departamento\n- Capacidad para hasta 3 personas\n- 1 baño\n- Se aceptan mascotas con un adicional en el depósito de garantía\n- No apto para niños\n- Disponible para ingreso inmediato\n\nValor y gastos\nAlquiler mensual: USD 600\nExpensas: $120.000 mensuales\nGastos adicionales a cargo del inquilino:\n- Electricidad\n- Wi-Fi\n\nCondiciones de alquiler\nModalidad: contrato anual.\nDisponibilidad: inmediata.\n\nUbicación\nUbicado sobre Maipú al 500, en el centro de Buenos Aires, en un entorno urbano con acceso a medios de transporte, comercios, restaurantes y servicios. Su ubicación permite desplazarse con facilidad hacia distintos barrios y zonas de interés de la ciudad.\n\nConsultas y visitas\nUna opción conveniente para quienes buscan un departamento en alquiler anual en el centro de Buenos Aires, con capacidad para hasta 3 personas y posibilidad de vivir con mascotas bajo las condiciones establecidas.\n\nContactá a LIMA INMOBILIARIA para consultar las condiciones de alquiler y coordinar una visita.", "properties.mai500.price": "USD 600", "properties.mai500.avail": "Ingreso inmediato", "properties.mai500.term": "Contrato anual", "pet.cond": "🐾 Acepta mascotas (con adicional)"});
    Object.assign(translations.pt, {"properties.mai500.title": "Apartamento no Centro de Buenos Aires", "properties.mai500.modalTitle": "Aluguel Temporário – Apartamento no Centro de Buenos Aires", "properties.mai500.location": "Maipú 500, 9° piso - Centro", "properties.mai500.desc": "ALUGUEL TEMPORÁRIO – APARTAMENTO NO CENTRO DE BUENOS AIRES\n\n📍 Maipú 500, 9º andar, unidade G – Cidade Autônoma de Buenos Aires\n\nAluguel mensal: USD 600\n\nApartamento no centro de Buenos Aires, em uma zona estratégica com excelente acesso a transporte público, comércios, serviços e diferentes pontos da cidade.\n\nO imóvel tem capacidade para até 3 pessoas e é uma alternativa prática para quem busca se estabelecer em Buenos Aires com um contrato de aluguel anual.\n\nCaracterísticas do apartamento\n- Capacidade para até 3 pessoas\n- 1 banheiro\n- Aceita animais de estimação, com um adicional no depósito de garantia\n- Não indicado para crianças\n- Disponível para entrada imediata\n\nValor e despesas\nAluguel mensal: USD 600\nExpensas (condomínio): ARS 120.000 mensais\nDespesas adicionais por conta do inquilino:\n- Eletricidade\n- Wi-Fi\n\nCondições de aluguel\nModalidade: contrato anual.\nDisponibilidade: imediata.\n\nLocalização\nNa Maipú 500, no centro de Buenos Aires, em um ambiente urbano com acesso a transporte, comércios, restaurantes e serviços. A localização permite se deslocar com facilidade para diferentes bairros e pontos de interesse da cidade.\n\nConsultas e visitas\nUma opção conveniente para quem busca um apartamento para aluguel anual no centro de Buenos Aires, com capacidade para até 3 pessoas e possibilidade de morar com animais de estimação nas condições estabelecidas.\n\nFale com a LIMA INMOBILIARIA para consultar as condições de aluguel e agendar uma visita.", "properties.mai500.price": "USD 600", "properties.mai500.avail": "Entrada imediata", "properties.mai500.term": "Contrato anual", "pet.cond": "🐾 Aceita pets (com adicional)"});
    Object.assign(translations.en, {"properties.mai500.title": "Apartment in Downtown Buenos Aires", "properties.mai500.modalTitle": "Temporary Rental – Apartment in Downtown Buenos Aires", "properties.mai500.location": "Maipú 500, 9° piso - Centro", "properties.mai500.desc": "TEMPORARY RENTAL – APARTMENT IN DOWNTOWN BUENOS AIRES\n\n📍 Maipú 500, 9th floor, unit G – Buenos Aires City\n\nMonthly rent: USD 600\n\nApartment in downtown Buenos Aires, in a strategic area with excellent access to public transport, shops, services and different parts of the city.\n\nThe property sleeps up to 3 people and is a practical option for those who want to settle in Buenos Aires with an annual lease.\n\nApartment features\n- Sleeps up to 3 people\n- 1 bathroom\n- Pets accepted with an extra amount added to the security deposit\n- Not suitable for children\n- Available for immediate move-in\n\nRent and expenses\nMonthly rent: USD 600\nExpensas (building fees): ARS 120,000 per month\nAdditional expenses paid by the tenant:\n- Electricity\n- Wi-Fi\n\nRental conditions\nType: annual contract.\nAvailability: immediate.\n\nLocation\nOn Maipú 500, in downtown Buenos Aires, in an urban setting with access to transport, shops, restaurants and services. The location makes it easy to get to different neighborhoods and places of interest in the city.\n\nInquiries and visits\nA convenient option for those looking for an apartment for annual rent in downtown Buenos Aires, for up to 3 people and with the possibility of living with pets under the established conditions.\n\nContact LIMA INMOBILIARIA to ask about rental conditions and to arrange a visit.", "properties.mai500.price": "USD 600", "properties.mai500.avail": "Immediate move-in", "properties.mai500.term": "Annual contract", "pet.cond": "🐾 Pets allowed (extra deposit)"});

    Object.assign(translations.es, {"properties.sui700.title": "Departamento 2 Ambientes en Microcentro", "properties.sui700.modalTitle": "Alquiler Temporario – 2 Ambientes en Microcentro", "properties.sui700.location": "Suipacha 700 - Microcentro", "properties.sui700.desc": "ALQUILER TEMPORARIO – 2 AMBIENTES EN MICROCENTRO\n\n📍 Suipacha 700 – Microcentro, Ciudad de Buenos Aires\n\nAlquiler mensual: USD 700\n\nDepartamento de 2 ambientes ubicado en pleno Microcentro de Buenos Aires, en una zona estratégica para quienes buscan vivir cerca de los principales centros comerciales, laborales y de transporte de la ciudad.\n\nLa propiedad ofrece una distribución funcional y cuenta con un dormitorio equipado con dos camas individuales, siendo una alternativa práctica para profesionales, estudiantes o personas que necesitan residir en una ubicación céntrica.\n\nCaracterísticas del departamento\n- 2 ambientes\n- Dormitorio con dos camas individuales\n- Distribución funcional\n- Ubicación céntrica\n\nValor y gastos\nAlquiler mensual: USD 700\nExpensas: $170.000 mensuales aproximadamente.\nServicios a cargo del inquilino:\n- Electricidad\n- Gas\n- Agua\n\nCondiciones de alquiler\nContrato: 1 año fijo.\n\nUbicación\nUbicado sobre Suipacha al 700, en Microcentro, a metros de la Avenida 9 de Julio y con acceso a diversas líneas de subte y transporte público.\n\nLa zona cuenta con una amplia oferta de comercios, oficinas, restaurantes, servicios y conexiones con distintos barrios de la Ciudad de Buenos Aires.\n\nDisponibilidad y consultas\nUna excelente alternativa para quienes buscan un departamento de 2 ambientes en alquiler en Microcentro, con dormitorio independiente y contrato de un año.\n\nContactá a LIMA INMOBILIARIA para solicitar más información sobre las condiciones de alquiler y coordinar una visita.", "properties.sui700.price": "USD 700", "properties.sui700.term": "Contrato de 1 año fijo"});
    Object.assign(translations.pt, {"properties.sui700.title": "Apartamento 2 Ambientes no Microcentro", "properties.sui700.modalTitle": "Aluguel Temporário – 2 Ambientes no Microcentro", "properties.sui700.location": "Suipacha 700 - Microcentro", "properties.sui700.desc": "ALUGUEL TEMPORÁRIO – 2 AMBIENTES NO MICROCENTRO\n\n📍 Suipacha 700 – Microcentro, Cidade de Buenos Aires\n\nAluguel mensal: USD 700\n\nApartamento de 2 ambientes em pleno Microcentro de Buenos Aires, em uma zona estratégica para quem busca morar perto dos principais centros comerciais, de trabalho e de transporte da cidade.\n\nO imóvel tem uma distribuição funcional e conta com um quarto equipado com duas camas de solteiro, sendo uma alternativa prática para profissionais, estudantes ou pessoas que precisam morar em um local central.\n\nCaracterísticas do apartamento\n- 2 ambientes\n- Quarto com duas camas de solteiro\n- Distribuição funcional\n- Localização central\n\nValor e despesas\nAluguel mensal: USD 700\nExpensas (condomínio): aproximadamente ARS 170.000 mensais.\nPor conta do inquilino:\n- Eletricidade\n- Gás\n- Água\n\nCondições de aluguel\nContrato: 1 ano fixo.\n\nLocalização\nNa Suipacha 700, no Microcentro, a poucos metros da Avenida 9 de Julio e com acesso a várias linhas de metrô e transporte público.\n\nA região tem ampla oferta de comércios, escritórios, restaurantes, serviços e conexões com diferentes bairros da Cidade de Buenos Aires.\n\nDisponibilidade e consultas\nUma excelente alternativa para quem busca um apartamento de 2 ambientes para alugar no Microcentro, com quarto independente e contrato de um ano.\n\nFale com a LIMA INMOBILIARIA para pedir mais informações sobre as condições de aluguel e agendar uma visita.", "properties.sui700.price": "USD 700", "properties.sui700.term": "Contrato de 1 ano fixo"});
    Object.assign(translations.en, {"properties.sui700.title": "2-Room Apartment in Microcentro", "properties.sui700.modalTitle": "Temporary Rental – 2-Room Apartment in Microcentro", "properties.sui700.location": "Suipacha 700 - Microcentro", "properties.sui700.desc": "TEMPORARY RENTAL – 2-ROOM APARTMENT IN MICROCENTRO\n\n📍 Suipacha 700 – Microcentro, Buenos Aires City\n\nMonthly rent: USD 700\n\n2-room apartment in the heart of Buenos Aires' Microcentro, in a strategic area for those who want to live close to the city's main shopping, business and transport hubs.\n\nThe property has a functional layout and a bedroom equipped with two single beds, making it a practical option for professionals, students or anyone who needs to live in a central location.\n\nApartment features\n- 2 rooms\n- Bedroom with two single beds\n- Functional layout\n- Central location\n\nRent and expenses\nMonthly rent: USD 700\nExpensas (building fees): approximately ARS 170,000 per month.\nTenant pays:\n- Electricity\n- Gas\n- Water\n\nRental conditions\nContract: fixed 1 year.\n\nLocation\nOn Suipacha 700, in Microcentro, steps from Avenida 9 de Julio and with access to several subway lines and public transport.\n\nThe area offers a wide range of shops, offices, restaurants, services and connections to different neighborhoods of Buenos Aires City.\n\nAvailability and inquiries\nAn excellent option for those looking for a 2-room apartment to rent in Microcentro, with a separate bedroom and a one-year contract.\n\nContact LIMA INMOBILIARIA to request more information about rental conditions and to arrange a visit.", "properties.sui700.price": "USD 700", "properties.sui700.term": "Fixed 1-year contract"});
    Object.assign(translations.es, {"properties.esm700.title": "Monoambiente en San Nicolás", "properties.esm700.modalTitle": "Alquiler Temporario – Monoambiente en San Nicolás", "properties.esm700.location": "Esmeralda 700 - San Nicolás", "properties.esm700.desc": "ALQUILER TEMPORARIO DE MONOAMBIENTE EN SAN NICOLÁS – CABA\n\n📍 Esmeralda al 700 – San Nicolás, Microcentro, Ciudad de Buenos Aires\n\nAlquiler mensual: USD 500\n\nMonoambiente ubicado en pleno Microcentro porteño, ideal para quienes buscan vivir cerca de comercios, oficinas, restaurantes y medios de transporte.\n\nCaracterísticas del departamento\n- Monoambiente\n- Capacidad para hasta 2 personas\n- Amoblado: cama matrimonial, mesa con sillas y placard\n- TV\n- Cocina equipada con anafe de inducción, heladera y microondas\n- Lavarropas\n- Se aceptan mascotas bajo condiciones\n\nValor y gastos\nAlquiler mensual: USD 500\nExpensas: $120.000 mensuales\nServicios a cargo del inquilino:\n- Electricidad\n- Wi-Fi\n\nCondiciones de alquiler\nContrato: 1 año fijo.\nSe aceptan mascotas bajo condiciones previamente acordadas.\n\nUbicación\nSituado en el barrio de San Nicolás, cerca de la calle Florida, galerías comerciales, oficinas y restaurantes. Cuenta con acceso a diversas líneas de transporte público y permite trasladarse fácilmente por la Ciudad de Buenos Aires.\n\nConsultas y visitas\nContactá a LIMA INMOBILIARIA para consultar las condiciones del alquiler y coordinar una visita.", "properties.esm700.price": "USD 500", "properties.esm700.term": "Contrato de 1 año fijo"});
    Object.assign(translations.pt, {"properties.esm700.title": "Apartamento Studio em San Nicolás", "properties.esm700.modalTitle": "Aluguel Temporário – Studio em San Nicolás", "properties.esm700.location": "Esmeralda 700 - San Nicolás", "properties.esm700.desc": "ALUGUEL TEMPORÁRIO DE STUDIO EM SAN NICOLÁS – CABA\n\n📍 Esmeralda 700 – San Nicolás, Microcentro, Cidade de Buenos Aires\n\nAluguel mensal: USD 500\n\nStudio (monoambiente) localizado em pleno Microcentro portenho, ideal para quem busca morar perto de comércio, escritórios, restaurantes e transporte.\n\nCaracterísticas do apartamento\n- Studio (monoambiente)\n- Capacidade para até 2 pessoas\n- Mobiliado: cama de casal, mesa com cadeiras e guarda-roupa\n- TV\n- Cozinha equipada com cooktop de indução, geladeira e micro-ondas\n- Máquina de lavar roupa\n- Aceita pets sob condições\n\nValores e despesas\nAluguel mensal: USD 500\nCondomínio: $120.000 mensais\nPor conta do inquilino:\n- Eletricidade\n- Wi-Fi\n\nCondições do aluguel\nContrato: 1 ano fixo.\nAceita pets sob condições previamente combinadas.\n\nLocalização\nSituado no bairro de San Nicolás, perto da rua Florida, galerias comerciais, escritórios e restaurantes. Tem acesso a diversas linhas de transporte público e permite se deslocar facilmente pela Cidade de Buenos Aires.\n\nConsultas e visitas\nFale com a LIMA INMOBILIARIA para consultar as condições do aluguel e agendar uma visita.", "properties.esm700.price": "USD 500", "properties.esm700.term": "Contrato de 1 ano fixo"});
    Object.assign(translations.en, {"properties.esm700.title": "Studio Apartment in San Nicolás", "properties.esm700.modalTitle": "Temporary Rental – Studio in San Nicolás", "properties.esm700.location": "Esmeralda 700 - San Nicolás", "properties.esm700.desc": "TEMPORARY RENTAL – STUDIO IN SAN NICOLÁS, BUENOS AIRES\n\n📍 Esmeralda 700 – San Nicolás, Microcentro, Buenos Aires City\n\nMonthly rent: USD 500\n\nStudio apartment right in Buenos Aires' Microcentro, ideal for anyone who wants to live close to shops, offices, restaurants and public transport.\n\nApartment features\n- Studio (single room)\n- Sleeps up to 2 people\n- Furnished: double bed, dining table with chairs and wardrobe\n- TV\n- Kitchenette with induction cooktop, fridge and microwave\n- Washing machine\n- Pets accepted under conditions\n\nRent and expenses\nMonthly rent: USD 500\nBuilding expenses: $120,000 per month\nTenant pays:\n- Electricity\n- Wi-Fi\n\nRental terms\nContract: fixed 1 year.\nPets are accepted under conditions agreed in advance.\n\nLocation\nLocated in the San Nicolás neighborhood, near Florida Street, shopping arcades, offices and restaurants. Easy access to several public transport lines and a quick way around Buenos Aires.\n\nInquiries and visits\nContact LIMA INMOBILIARIA to ask about the rental terms and arrange a visit.", "properties.esm700.price": "USD 500", "properties.esm700.term": "Fixed 1-year contract"});
    Object.assign(translations.es, {"properties.pal800b.title": "Departamento 2 Ambientes en Almagro", "properties.pal800b.modalTitle": "Alquiler de 2 Ambientes en Almagro – Apto Mascotas", "properties.pal800b.location": "Palestina 800, Depto B - Almagro", "properties.pal800b.desc": "ALQUILER DE 2 AMBIENTES EN ALMAGRO – APTO MASCOTAS\n\n📍 Palestina al 800 – Almagro, Ciudad de Buenos Aires (Departamento B)\n\nAlquiler mensual: $980.000\n\nDepartamento de 2 ambientes, cómodo y funcional, ubicado en el barrio de Almagro. Cuenta con un amplio balcón y lavarropas, ideal para quienes buscan comodidad y un espacio exterior en una zona con excelente conectividad.\n\nCaracterísticas del departamento\n- 2 ambientes\n- Amplio balcón\n- Lavarropas\n- Apto para mascotas\n- Living comedor con mesa y sillas\n- Dormitorio con cama matrimonial\n- Cocina con horno y heladera\n\nValor y gastos\nAlquiler mensual: $980.000\nServicios a cargo del inquilino:\n- Electricidad\n- Gas\n- Wi-Fi\n\nCondiciones de alquiler\nContrato semestral.\nSe aceptan mascotas.\n\nUbicación\nEn el corazón de Almagro, a pocos pasos de la avenida Corrientes, estaciones de subte, universidades, cafés y comercios. Una zona con gran oferta cultural y excelente acceso al transporte público.\n\nConsultas y visitas\nContactá a LIMA INMOBILIARIA para consultar el precio actualizado, las condiciones del alquiler y coordinar una visita.", "properties.pal800b.price": "$980.000", "properties.pal800b.term": "Contrato semestral"});
    Object.assign(translations.pt, {"properties.pal800b.title": "Apartamento 2 Ambientes em Almagro", "properties.pal800b.modalTitle": "Aluguel de 2 Ambientes em Almagro – Aceita Pets", "properties.pal800b.location": "Palestina 800, Depto B - Almagro", "properties.pal800b.desc": "ALUGUEL DE 2 AMBIENTES EM ALMAGRO – ACEITA PETS\n\n📍 Palestina 800 – Almagro, Cidade de Buenos Aires (Departamento B)\n\nAluguel mensal: $980.000\n\nApartamento de 2 ambientes, confortável e funcional, localizado no bairro de Almagro. Conta com uma ampla varanda e máquina de lavar roupa, ideal para quem busca conforto e um espaço externo em uma região com excelente conectividade.\n\nCaracterísticas do apartamento\n- 2 ambientes\n- Ampla varanda\n- Máquina de lavar roupa\n- Aceita pets\n- Sala de estar e jantar com mesa e cadeiras\n- Quarto com cama de casal\n- Cozinha com forno e geladeira\n\nValores e despesas\nAluguel mensal: $980.000\nPor conta do inquilino:\n- Eletricidade\n- Gás\n- Wi-Fi\n\nCondições do aluguel\nContrato semestral.\nAceita pets.\n\nLocalização\nNo coração de Almagro, a poucos passos da avenida Corrientes, estações de metrô, universidades, cafés e comércio. Uma região com grande oferta cultural e excelente acesso ao transporte público.\n\nConsultas e visitas\nFale com a LIMA INMOBILIARIA para consultar o preço atualizado, as condições do aluguel e agendar uma visita.", "properties.pal800b.price": "$980.000", "properties.pal800b.term": "Contrato semestral"});
    Object.assign(translations.en, {"properties.pal800b.title": "2-Room Apartment in Almagro", "properties.pal800b.modalTitle": "2-Room Rental in Almagro – Pet Friendly", "properties.pal800b.location": "Palestina 800, Apt B - Almagro", "properties.pal800b.desc": "2-ROOM RENTAL IN ALMAGRO – PET FRIENDLY\n\n📍 Palestina 800 – Almagro, Buenos Aires City (Apartment B)\n\nMonthly rent: $980,000\n\nComfortable, functional 2-room apartment in the Almagro neighborhood. It has a large balcony and a washing machine, ideal for anyone who wants comfort and an outdoor space in a well-connected area.\n\nApartment features\n- 2 rooms\n- Large balcony\n- Washing machine\n- Pet friendly\n- Living and dining area with table and chairs\n- Bedroom with double bed\n- Kitchen with oven and fridge\n\nRent and expenses\nMonthly rent: $980,000\nTenant pays:\n- Electricity\n- Gas\n- Wi-Fi\n\nRental terms\n6-month contract.\nPets accepted.\n\nLocation\nIn the heart of Almagro, a few steps from Corrientes Avenue, subway stations, universities, cafés and shops. An area with a great cultural scene and excellent access to public transport.\n\nInquiries and visits\nContact LIMA INMOBILIARIA to ask for the updated price, the rental terms and to arrange a visit.", "properties.pal800b.price": "$980.000", "properties.pal800b.term": "6-month contract"});
    Object.assign(translations.es, {"properties.cpl800.title": "Monoambiente en Caballito", "properties.cpl800.modalTitle": "Alquiler Temporario – Monoambiente en Caballito", "properties.cpl800.location": "Av. La Plata y Av. Rivadavia - Caballito", "properties.cpl800.desc": "ALQUILER TEMPORARIO – MONOAMBIENTE EN CABALLITO\n\n📍 Av. La Plata y Av. Rivadavia – Caballito, Ciudad de Buenos Aires\n\nAlquiler mensual: $800.000\n\nDisponibilidad inmediata. Capacidad: hasta 2 personas.\n\nMonoambiente equipado para una estadía cómoda en Buenos Aires, ubicado en una zona estratégica del barrio de Caballito, con acceso a comercios, servicios y transporte público.\n\nCaracterísticas del departamento\n- Cama doble\n- TV LCD con cable\n- Aire acondicionado\n- Heladera con freezer\n- Baño completo\n\nImportante\nEl departamento no incluye sábanas ni toallas y no admite mascotas.\n\nCondiciones del alquiler\n- Contrato trimestral o semestral, renovable\n- Ajuste trimestral según el índice IPC\n- Electricidad y gas con topes de consumo\n\nConsultas y visitas\nContactá a LIMA INMOBILIARIA para consultar las condiciones del alquiler y coordinar una visita.", "properties.cpl800.price": "$800.000", "properties.cpl800.avail": "Ingreso inmediato", "properties.cpl800.term": "Contrato de 3 o 6 meses"});
    Object.assign(translations.pt, {"properties.cpl800.title": "Studio em Caballito", "properties.cpl800.modalTitle": "Aluguel Temporário – Studio em Caballito", "properties.cpl800.location": "Av. La Plata e Av. Rivadavia - Caballito", "properties.cpl800.desc": "ALUGUEL TEMPORÁRIO – STUDIO EM CABALLITO\n\n📍 Av. La Plata e Av. Rivadavia – Caballito, Cidade de Buenos Aires\n\nAluguel mensal: $800.000\n\nDisponibilidade imediata. Capacidade: até 2 pessoas.\n\nStudio (monoambiente) equipado para uma estadia confortável em Buenos Aires, localizado em uma região estratégica do bairro de Caballito, com acesso a comércio, serviços e transporte público.\n\nCaracterísticas do apartamento\n- Cama de casal\n- TV LCD com TV a cabo\n- Ar-condicionado\n- Geladeira com freezer\n- Banheiro completo\n\nImportante\nO apartamento não inclui lençóis nem toalhas e não aceita pets.\n\nCondições do aluguel\n- Contrato trimestral ou semestral, renovável\n- Reajuste trimestral conforme o índice IPC\n- Eletricidade e gás com limites de consumo\n\nConsultas e visitas\nFale com a LIMA INMOBILIARIA para consultar as condições do aluguel e agendar uma visita.", "properties.cpl800.price": "$800.000", "properties.cpl800.avail": "Entrada imediata", "properties.cpl800.term": "Contrato de 3 ou 6 meses"});
    Object.assign(translations.en, {"properties.cpl800.title": "Studio Apartment in Caballito", "properties.cpl800.modalTitle": "Temporary Rental – Studio in Caballito", "properties.cpl800.location": "Av. La Plata & Av. Rivadavia - Caballito", "properties.cpl800.desc": "TEMPORARY RENTAL – STUDIO IN CABALLITO\n\n📍 Av. La Plata & Av. Rivadavia – Caballito, Buenos Aires City\n\nMonthly rent: $800,000\n\nAvailable immediately. Sleeps up to 2 people.\n\nFurnished studio apartment for a comfortable stay in Buenos Aires, in a strategic area of the Caballito neighborhood with access to shops, services and public transport.\n\nApartment features\n- Double bed\n- LCD TV with cable\n- Air conditioning\n- Fridge with freezer\n- Full bathroom\n\nImportant\nThe apartment does not include sheets or towels and does not accept pets.\n\nRental terms\n- 3-month or 6-month contract, renewable\n- Quarterly rent adjustment based on the IPC index\n- Electricity and gas with consumption caps\n\nInquiries and visits\nContact LIMA INMOBILIARIA to ask about the rental terms and arrange a visit.", "properties.cpl800.price": "$800.000", "properties.cpl800.avail": "Immediate move-in", "properties.cpl800.term": "3 or 6-month contract"});
    Object.assign(translations.es, {"properties.permon.title": "Monoambiente en el Centro", "properties.permon.modalTitle": "Alquiler Temporario – Monoambiente en el Centro de Buenos Aires", "properties.permon.location": "Perón y Montevideo - Centro", "properties.permon.desc": "ALQUILER TEMPORARIO – MONOAMBIENTE EN EL CENTRO DE BUENOS AIRES\n\n📍 Perón y Montevideo – Centro, Ciudad de Buenos Aires\n\nAlquiler mensual: USD 450\n\nDisponibilidad inmediata. Capacidad: hasta 2 personas.\n\nMonoambiente funcional, ideal para una o dos personas que buscan vivir en una ubicación céntrica de Buenos Aires, con acceso a comercios, servicios y transporte público.\n\nCaracterísticas del departamento\n- Cocina con horno y cocina a gas\n- Heladera con freezer\n- Aire acondicionado frío\n- Estufa eléctrica\n- Baño completo\n\nCondiciones del alquiler\n- Contrato trimestral o semestral, renovable.\n- Alquiler mensual: USD 450.\n- Pago en dólares billete o en pesos argentinos al tipo de cambio blue del día.\n- ABL incluido.\n- Expensas: $123.000 aproximadamente por mes.\n\nGastos a cargo del inquilino\n- Agua, según consumo.\n- Electricidad, según consumo.\n- Gas, según consumo.\n- Internet, que deberá contratar por su cuenta.\n\nUbicación\nUbicado en la zona céntrica de la Ciudad Autónoma de Buenos Aires, en la intersección de Perón y Montevideo, con cercanía a comercios, restaurantes, servicios y distintas opciones de transporte público.\n\nConsultas y visitas\nContactá a LIMA INMOBILIARIA para consultar las condiciones del alquiler y coordinar una visita.", "properties.permon.price": "USD 450", "properties.permon.avail": "Ingreso inmediato", "properties.permon.term": "Contrato de 3 o 6 meses"});
    Object.assign(translations.pt, {"properties.permon.title": "Studio no Centro", "properties.permon.modalTitle": "Aluguel Temporário – Studio no Centro de Buenos Aires", "properties.permon.location": "Perón e Montevideo - Centro", "properties.permon.desc": "ALUGUEL TEMPORÁRIO – STUDIO NO CENTRO DE BUENOS AIRES\n\n📍 Perón e Montevideo – Centro, Cidade de Buenos Aires\n\nAluguel mensal: USD 450\n\nDisponibilidade imediata. Capacidade: até 2 pessoas.\n\nStudio (monoambiente) funcional, ideal para uma ou duas pessoas que buscam morar em uma localização central de Buenos Aires, com acesso a comércio, serviços e transporte público.\n\nCaracterísticas do apartamento\n- Cozinha com forno e fogão a gás\n- Geladeira com freezer\n- Ar-condicionado frio\n- Aquecedor elétrico\n- Banheiro completo\n\nCondições do aluguel\n- Contrato trimestral ou semestral, renovável.\n- Aluguel mensal: USD 450.\n- Pagamento em dólares em espécie ou em pesos argentinos pela cotação do dólar blue do dia.\n- ABL incluído.\n- Condomínio: aproximadamente $123.000 por mês.\n\nDespesas por conta do inquilino\n- Água, conforme o consumo.\n- Eletricidade, conforme o consumo.\n- Gás, conforme o consumo.\n- Internet, que deve ser contratada por conta própria.\n\nLocalização\nLocalizado na região central da Cidade Autônoma de Buenos Aires, no cruzamento de Perón com Montevideo, perto de comércio, restaurantes, serviços e várias opções de transporte público.\n\nConsultas e visitas\nFale com a LIMA INMOBILIARIA para consultar as condições do aluguel e agendar uma visita.", "properties.permon.price": "USD 450", "properties.permon.avail": "Entrada imediata", "properties.permon.term": "Contrato de 3 ou 6 meses"});
    Object.assign(translations.en, {"properties.permon.title": "Studio Apartment in the Center", "properties.permon.modalTitle": "Temporary Rental – Studio in Downtown Buenos Aires", "properties.permon.location": "Perón & Montevideo - Centro", "properties.permon.desc": "TEMPORARY RENTAL – STUDIO IN DOWNTOWN BUENOS AIRES\n\n📍 Perón & Montevideo – Centro, Buenos Aires City\n\nMonthly rent: USD 450\n\nAvailable immediately. Sleeps up to 2 people.\n\nFunctional studio apartment, ideal for one or two people who want to live in a central location in Buenos Aires, with access to shops, services and public transport.\n\nApartment features\n- Kitchen with oven and gas stove\n- Fridge with freezer\n- Air conditioning (cooling)\n- Electric heater\n- Full bathroom\n\nRental terms\n- 3-month or 6-month contract, renewable.\n- Monthly rent: USD 450.\n- Payment in US dollar cash or in Argentine pesos at the day's blue dollar rate.\n- ABL (municipal tax) included.\n- Building expenses: approximately $123,000 per month.\n\nTenant pays\n- Water, based on usage.\n- Electricity, based on usage.\n- Gas, based on usage.\n- Internet, to be arranged by the tenant.\n\nLocation\nLocated in the downtown area of Buenos Aires, at the corner of Perón and Montevideo, close to shops, restaurants, services and several public transport options.\n\nInquiries and visits\nContact LIMA INMOBILIARIA to ask about the rental terms and arrange a visit.", "properties.permon.price": "USD 450", "properties.permon.avail": "Immediate move-in", "properties.permon.term": "3 or 6-month contract"});
    Object.assign(translations.es, {"properties.retalm.title": "Monoambiente en Centro / Retiro", "properties.retalm.modalTitle": "Alquiler Temporario – Monoambiente en Centro / Retiro", "properties.retalm.location": "Paraguay y Av. Leandro N. Alem - Centro / Retiro", "properties.retalm.desc": "ALQUILER TEMPORARIO – MONOAMBIENTE EN CENTRO / RETIRO\n\n📍 Paraguay y Av. Leandro N. Alem – Centro / Retiro, zona Plaza San Martín, Ciudad de Buenos Aires\n\nAlquiler mensual: USD 600\n\nCapacidad: hasta 2 personas.\n\nMonoambiente ubicado en una zona estratégica de Buenos Aires, ideal para quienes buscan vivir cerca del centro financiero, comercios, restaurantes y medios de transporte.\n\nCaracterísticas del departamento\n- Monoambiente para hasta 2 personas\n- No incluye sábanas ni toallas\n- No se admiten mascotas\n\nCondiciones del alquiler\n- Alquiler mensual: USD 600\n- Contrato semestral, renovable\n- Pago en dólares billete o en pesos argentinos al tipo de cambio blue del día del pago\n\nIncluye\n- Expensas\n- ABL\n- Internet\n\nServicios a cargo del inquilino\n- Electricidad\n- Agua\n- Gas\n\nUbicación\nSituado en la zona de Centro / Retiro, cerca de Plaza San Martín, con acceso a oficinas, comercios, restaurantes y distintas opciones de transporte público.\n\nConsultas y visitas\nContactá a LIMA INMOBILIARIA para consultar las condiciones del alquiler y coordinar una visita.", "properties.retalm.price": "USD 600", "properties.retalm.avail": "", "properties.retalm.term": "Contrato semestral"});
    Object.assign(translations.pt, {"properties.retalm.title": "Studio no Centro / Retiro", "properties.retalm.modalTitle": "Aluguel Temporário – Studio no Centro / Retiro", "properties.retalm.location": "Paraguay e Av. Leandro N. Alem - Centro / Retiro", "properties.retalm.desc": "ALUGUEL TEMPORÁRIO – STUDIO NO CENTRO / RETIRO\n\n📍 Paraguay e Av. Leandro N. Alem – Centro / Retiro, região da Plaza San Martín, Cidade de Buenos Aires\n\nAluguel mensal: USD 600\n\nCapacidade: até 2 pessoas.\n\nStudio (monoambiente) localizado em uma região estratégica de Buenos Aires, ideal para quem busca morar perto do centro financeiro, comércio, restaurantes e transporte.\n\nCaracterísticas do apartamento\n- Studio para até 2 pessoas\n- Não inclui lençóis nem toalhas\n- Não aceita pets\n\nCondições do aluguel\n- Aluguel mensal: USD 600\n- Contrato semestral, renovável\n- Pagamento em dólares em espécie ou em pesos argentinos pela cotação do dólar blue do dia do pagamento\n\nInclui\n- Condomínio\n- ABL\n- Internet\n\nPor conta do inquilino\n- Eletricidade\n- Água\n- Gás\n\nLocalização\nSituado na região Centro / Retiro, perto da Plaza San Martín, com acesso a escritórios, comércio, restaurantes e várias opções de transporte público.\n\nConsultas e visitas\nFale com a LIMA INMOBILIARIA para consultar as condições do aluguel e agendar uma visita.", "properties.retalm.price": "USD 600", "properties.retalm.avail": "", "properties.retalm.term": "Contrato semestral"});
    Object.assign(translations.en, {"properties.retalm.title": "Studio Apartment in Centro / Retiro", "properties.retalm.modalTitle": "Temporary Rental – Studio in Centro / Retiro", "properties.retalm.location": "Paraguay & Av. Leandro N. Alem - Centro / Retiro", "properties.retalm.desc": "TEMPORARY RENTAL – STUDIO IN CENTRO / RETIRO\n\n📍 Paraguay & Av. Leandro N. Alem – Centro / Retiro, Plaza San Martín area, Buenos Aires City\n\nMonthly rent: USD 600\n\nSleeps up to 2 people.\n\nStudio apartment in a strategic area of Buenos Aires, ideal for anyone who wants to live close to the financial district, shops, restaurants and public transport.\n\nApartment features\n- Studio for up to 2 people\n- Sheets and towels not included\n- No pets allowed\n\nRental terms\n- Monthly rent: USD 600\n- 6-month contract, renewable\n- Payment in US dollar cash or in Argentine pesos at the blue dollar rate on the day of payment\n\nIncluded\n- Building expenses\n- ABL (municipal tax)\n- Internet\n\nTenant pays\n- Electricity\n- Water\n- Gas\n\nLocation\nLocated in the Centro / Retiro area, near Plaza San Martín, with access to offices, shops, restaurants and several public transport options.\n\nInquiries and visits\nContact LIMA INMOBILIARIA to ask about the rental terms and arrange a visit.", "properties.retalm.price": "USD 600", "properties.retalm.avail": "", "properties.retalm.term": "6-month contract"});
    Object.assign(translations.es, {"properties.parayac.title": "Monoambiente en Recoleta / Balvanera", "properties.parayac.modalTitle": "Alquiler Temporario – Monoambiente en Recoleta / Balvanera", "properties.parayac.location": "Paraguay y Ayacucho - Recoleta / Balvanera", "properties.parayac.desc": "ALQUILER TEMPORARIO – MONOAMBIENTE EN RECOLETA / BALVANERA\n\n📍 Paraguay y Ayacucho – Recoleta / Balvanera, Ciudad de Buenos Aires\n\nAlquiler mensual: USD 700\n\nCapacidad: hasta 2 personas.\nDisponibilidad y visitas: desde el 21 de noviembre de 2026.\n\nMonoambiente ubicado en la zona de Recoleta / Balvanera, ideal para una o dos personas que buscan comodidad y una buena ubicación en la Ciudad de Buenos Aires.\n\nCaracterísticas del departamento\n- Monoambiente para hasta 2 personas\n- Balcón al frente\n- Aire acondicionado\n- TV\n- Heladera con freezer y microondas\n- Mesa con sillas\n- Placards\n- Electricidad y gas con topes de consumo\n\nCondiciones del alquiler\n- Alquiler mensual: USD 700\n- Contrato trimestral o semestral, renovable\n- Pago en dólares billete o en pesos argentinos al tipo de cambio blue del día del pago\n- Electricidad y gas sujetos a topes de consumo\n\nUbicación\nSituado en la intersección de Paraguay y Ayacucho, en el límite de las zonas de Recoleta y Balvanera, con acceso a comercios, restaurantes, servicios y transporte público.\n\nConsultas y visitas\nContactá a LIMA INMOBILIARIA para consultar las condiciones del alquiler y coordinar una visita a partir del 21 de noviembre de 2026.", "properties.parayac.price": "USD 700", "properties.parayac.avail": "Desde el 21/11/2026", "properties.parayac.term": "Contrato de 3 o 6 meses"});
    Object.assign(translations.pt, {"properties.parayac.title": "Studio em Recoleta / Balvanera", "properties.parayac.modalTitle": "Aluguel Temporário – Studio em Recoleta / Balvanera", "properties.parayac.location": "Paraguay e Ayacucho - Recoleta / Balvanera", "properties.parayac.desc": "ALUGUEL TEMPORÁRIO – STUDIO EM RECOLETA / BALVANERA\n\n📍 Paraguay e Ayacucho – Recoleta / Balvanera, Cidade de Buenos Aires\n\nAluguel mensal: USD 700\n\nCapacidade: até 2 pessoas.\nDisponibilidade e visitas: a partir de 21 de novembro de 2026.\n\nStudio (monoambiente) localizado na região de Recoleta / Balvanera, ideal para uma ou duas pessoas que buscam conforto e uma boa localização na Cidade de Buenos Aires.\n\nCaracterísticas do apartamento\n- Studio para até 2 pessoas\n- Varanda de frente\n- Ar-condicionado\n- TV\n- Geladeira com freezer e micro-ondas\n- Mesa com cadeiras\n- Armários\n- Eletricidade e gás com limites de consumo\n\nCondições do aluguel\n- Aluguel mensal: USD 700\n- Contrato trimestral ou semestral, renovável\n- Pagamento em dólares em espécie ou em pesos argentinos pela cotação do dólar blue do dia do pagamento\n- Eletricidade e gás sujeitos a limites de consumo\n\nLocalização\nSituado no cruzamento de Paraguay com Ayacucho, no limite entre as regiões de Recoleta e Balvanera, com acesso a comércio, restaurantes, serviços e transporte público.\n\nConsultas e visitas\nFale com a LIMA INMOBILIARIA para consultar as condições do aluguel e agendar uma visita a partir de 21 de novembro de 2026.", "properties.parayac.price": "USD 700", "properties.parayac.avail": "A partir de 21/11/2026", "properties.parayac.term": "Contrato de 3 ou 6 meses"});
    Object.assign(translations.en, {"properties.parayac.title": "Studio Apartment in Recoleta / Balvanera", "properties.parayac.modalTitle": "Temporary Rental – Studio in Recoleta / Balvanera", "properties.parayac.location": "Paraguay & Ayacucho - Recoleta / Balvanera", "properties.parayac.desc": "TEMPORARY RENTAL – STUDIO IN RECOLETA / BALVANERA\n\n📍 Paraguay & Ayacucho – Recoleta / Balvanera, Buenos Aires City\n\nMonthly rent: USD 700\n\nSleeps up to 2 people.\nAvailability and visits: from November 21, 2026.\n\nStudio apartment in the Recoleta / Balvanera area, ideal for one or two people looking for comfort and a good location in Buenos Aires.\n\nApartment features\n- Studio for up to 2 people\n- Front balcony\n- Air conditioning\n- TV\n- Fridge with freezer and microwave\n- Table with chairs\n- Wardrobes\n- Electricity and gas with consumption caps\n\nRental terms\n- Monthly rent: USD 700\n- 3-month or 6-month contract, renewable\n- Payment in US dollar cash or in Argentine pesos at the blue dollar rate on the day of payment\n- Electricity and gas subject to consumption caps\n\nLocation\nLocated at the corner of Paraguay and Ayacucho, on the border between Recoleta and Balvanera, with access to shops, restaurants, services and public transport.\n\nInquiries and visits\nContact LIMA INMOBILIARIA to ask about the rental terms and arrange a visit from November 21, 2026.", "properties.parayac.price": "USD 700", "properties.parayac.avail": "Available Nov 21, 2026", "properties.parayac.term": "3 or 6-month contract"});

    Object.assign(translations.es, {"about.founder.quote": "“Creé Lima para que ningún estudiante extranjero tenga que enfrentar solo la burocracia de alquilar en Buenos Aires.”", "about.founder.role": "CEO y Fundadora"});
    Object.assign(translations.pt, {"about.founder.quote": "“Criei a Lima para que nenhum estudante estrangeiro precise enfrentar sozinho a burocracia de alugar em Buenos Aires.”", "about.founder.role": "CEO e Fundadora"});
    Object.assign(translations.en, {"about.founder.quote": "“I created Lima so that no international student has to face the paperwork of renting in Buenos Aires alone.”", "about.founder.role": "CEO & Founder"});

    Object.assign(translations.es, {"properties.sol300.title": "Monoambiente sin Amueblar en Monserrat", "properties.sol300.modalTitle": "Alquiler Temporario – Monoambiente en Monserrat", "properties.sol300.location": "Solís 300, 6° piso - Monserrat", "properties.sol300.desc": "ALQUILER TEMPORARIO – MONOAMBIENTE EN MONSERRAT\n\n📍 Solís al 300, 6.º piso – Monserrat, Ciudad Autónoma de Buenos Aires\n\nAlquiler mensual: $600.000\n\nDepósito: $800.000\n\nExpensas: $175.000 aproximadamente\n\nCaracterísticas del departamento\n- Monoambiente sin amueblar\n- Capacidad para 2 personas\n- Ubicado en el 6.º piso\n- Ideal para personalizar y amueblar según las preferencias del inquilino\n\nServicios y gastos\nLos siguientes servicios y gastos están a cargo del inquilino:\n- Electricidad\n- Gas\n- Agua\n- ABL\n- Wi-Fi\n\nUbicación\nUbicado en el barrio de Monserrat, en la Ciudad Autónoma de Buenos Aires, es una opción práctica para quienes buscan un espacio propio y desean equiparlo a su gusto.\n\nConsultas y visitas\nContactá a LIMA INMOBILIARIA para conocer las condiciones del alquiler y coordinar una visita.", "properties.sol300.price": "$600.000", "properties.sol300.term": "Sin amueblar"});
    Object.assign(translations.pt, {"properties.sol300.title": "Monoambiente sem Mobília em Monserrat", "properties.sol300.modalTitle": "Aluguel Temporário – Monoambiente em Monserrat", "properties.sol300.location": "Solís 300, 6° piso - Monserrat", "properties.sol300.desc": "ALUGUEL TEMPORÁRIO – MONOAMBIENTE EM MONSERRAT\n\n📍 Solís 300, 6º andar – Monserrat, Cidade Autônoma de Buenos Aires\n\nAluguel mensal: ARS 600.000\n\nDepósito: ARS 800.000\n\nExpensas (condomínio): aproximadamente ARS 175.000\n\nCaracterísticas do apartamento\n- Monoambiente sem mobília\n- Capacidade para 2 pessoas\n- Localizado no 6º andar\n- Ideal para personalizar e mobiliar conforme as preferências do inquilino\n\nServiços e despesas\nOs seguintes serviços e despesas ficam por conta do inquilino:\n- Eletricidade\n- Gás\n- Água\n- ABL (IPTU)\n- Wi-Fi\n\nLocalização\nNo bairro de Monserrat, na Cidade Autônoma de Buenos Aires, é uma opção prática para quem busca um espaço próprio e quer equipá-lo ao seu gosto.\n\nConsultas e visitas\nFale com a LIMA INMOBILIARIA para conhecer as condições do aluguel e agendar uma visita.", "properties.sol300.price": "ARS 600.000", "properties.sol300.term": "Sem mobília"});
    Object.assign(translations.en, {"properties.sol300.title": "Unfurnished Studio Apartment in Monserrat", "properties.sol300.modalTitle": "Temporary Rental – Studio Apartment in Monserrat", "properties.sol300.location": "Solís 300, 6° piso - Monserrat", "properties.sol300.desc": "TEMPORARY RENTAL – STUDIO APARTMENT IN MONSERRAT\n\n📍 Solís 300, 6th floor – Monserrat, Buenos Aires City\n\nMonthly rent: ARS 600,000\n\nSecurity deposit: ARS 800,000\n\nExpensas (building fees): approximately ARS 175,000\n\nApartment features\n- Unfurnished studio apartment\n- Sleeps 2 people\n- 6th floor\n- Ideal for personalizing and furnishing to the tenant's taste\n\nServices and expenses\nThe following services and expenses are paid by the tenant:\n- Electricity\n- Gas\n- Water\n- ABL (property tax)\n- Wi-Fi\n\nLocation\nIn the Monserrat neighborhood of Buenos Aires City, it is a practical option for those looking for a place of their own that they can furnish to their liking.\n\nInquiries and visits\nContact LIMA INMOBILIARIA to learn about the rental conditions and to arrange a visit.", "properties.sol300.price": "ARS 600,000", "properties.sol300.term": "Unfurnished"});

    Object.assign(translations.es, {"properties.rec21.title": "Departamento de Lujo 3 Ambientes con Cochera en Recoleta", "properties.rec21.modalTitle": "Alquiler Temporario de Lujo – Departamento de 3 Ambientes en Recoleta", "properties.rec21.location": "21° piso - Recoleta", "properties.rec21.desc": "ALQUILER TEMPORARIO DE LUJO – DEPARTAMENTO DE 3 AMBIENTES EN RECOLETA\n\n📍 Recoleta, Ciudad Autónoma de Buenos Aires – Piso 21.º, con vista panorámica al río\n\nDisponibilidad: desde el 1 de diciembre de 2026\n\nAlquiler mensual: USD 1.600 + electricidad\n\nContrato: mínimo 3 meses\n\nCochera: privada incluida\n\nCaracterísticas del departamento\nExclusivo departamento de 75 m² cubiertos y 10 m² de balcón, ubicado en una de las zonas más distinguidas de Buenos Aires. Su altura y su balcón con vista panorámica al río ofrecen un entorno privilegiado para disfrutar de la ciudad.\n- 3 ambientes\n- 2 dormitorios\n- 2 baños\n- Capacidad para hasta 3 personas\n- Living comedor con decoración elegante y obras de arte\n- Cocina totalmente equipada\n- Lavavajillas y heladera con freezer\n- Lavarropas\n- Balcón con vista panorámica al río\n- Ropa blanca incluida\n- Cochera privada incluida\n\nUbicación privilegiada\nA 100 metros de las avenidas Libertador y Alvear, con fácil acceso a Patio Bullrich, restaurantes, comercios y puntos turísticos de Buenos Aires.\n\nUna excelente opción para quienes buscan confort, privacidad y exclusividad en una ubicación premium de Buenos Aires.\n\nConsultas y reservas: Contactá a LIMA INMOBILIARIA para consultar las condiciones y coordinar una visita.", "properties.rec21.price": "USD 1.600", "properties.rec21.avail": "Disponible desde el 1/12/2026", "properties.rec21.term": "Mínimo 3 meses"});
    Object.assign(translations.pt, {"properties.rec21.title": "Apartamento de Luxo 3 Ambientes com Garagem em Recoleta", "properties.rec21.modalTitle": "Aluguel Temporário de Luxo – Apartamento de 3 Ambientes em Recoleta", "properties.rec21.location": "21° piso - Recoleta", "properties.rec21.desc": "ALUGUEL TEMPORÁRIO DE LUXO – APARTAMENTO DE 3 AMBIENTES EM RECOLETA\n\n📍 Recoleta, Cidade Autônoma de Buenos Aires – 21º andar, com vista panorâmica para o rio\n\nDisponibilidade: a partir de 1º de dezembro de 2026\n\nAluguel mensal: USD 1.600 + eletricidade\n\nContrato: mínimo de 3 meses\n\nGaragem: privativa, incluída\n\nCaracterísticas do apartamento\nExclusivo apartamento de 75 m² cobertos e 10 m² de varanda, em uma das zonas mais distintas de Buenos Aires. A altura e a varanda com vista panorâmica para o rio oferecem um ambiente privilegiado para aproveitar a cidade.\n- 3 ambientes\n- 2 quartos\n- 2 banheiros\n- Capacidade para até 3 pessoas\n- Sala de estar e jantar com decoração elegante e obras de arte\n- Cozinha totalmente equipada\n- Lava-louças e geladeira com freezer\n- Máquina de lavar roupa\n- Varanda com vista panorâmica para o rio\n- Roupa de cama e banho incluída\n- Garagem privativa incluída\n\nLocalização privilegiada\nA 100 metros das avenidas Libertador e Alvear, com fácil acesso ao Patio Bullrich, restaurantes, comércios e pontos turísticos de Buenos Aires.\n\nUma excelente opção para quem busca conforto, privacidade e exclusividade em uma localização premium de Buenos Aires.\n\nConsultas e reservas: fale com a LIMA INMOBILIARIA para conhecer as condições e agendar uma visita.", "properties.rec21.price": "USD 1.600", "properties.rec21.avail": "Disponível a partir de 1/12/2026", "properties.rec21.term": "Mínimo de 3 meses"});
    Object.assign(translations.en, {"properties.rec21.title": "Luxury 3-Room Apartment with Parking in Recoleta", "properties.rec21.modalTitle": "Luxury Temporary Rental – 3-Room Apartment in Recoleta", "properties.rec21.location": "21° piso - Recoleta", "properties.rec21.desc": "LUXURY TEMPORARY RENTAL – 3-ROOM APARTMENT IN RECOLETA\n\n📍 Recoleta, Buenos Aires City – 21st floor, with panoramic river views\n\nAvailability: from December 1, 2026\n\nMonthly rent: USD 1,600 + electricity\n\nContract: minimum 3 months\n\nParking: private, included\n\nApartment features\nExclusive apartment with 75 m² indoors and a 10 m² balcony, in one of the most distinguished areas of Buenos Aires. Its height and its balcony with panoramic river views offer a privileged setting to enjoy the city.\n- 3 rooms\n- 2 bedrooms\n- 2 bathrooms\n- Sleeps up to 3 people\n- Living and dining room with elegant decor and works of art\n- Fully equipped kitchen\n- Dishwasher and fridge with freezer\n- Washing machine\n- Balcony with panoramic river views\n- Linens included\n- Private parking included\n\nPrime location\n100 meters from Libertador and Alvear avenues, with easy access to Patio Bullrich, restaurants, shops and tourist spots in Buenos Aires.\n\nAn excellent option for those looking for comfort, privacy and exclusivity in a premium location in Buenos Aires.\n\nInquiries and reservations: contact LIMA INMOBILIARIA to ask about the conditions and to arrange a visit.", "properties.rec21.price": "USD 1,600", "properties.rec21.avail": "Available from Dec 1, 2026", "properties.rec21.term": "Minimum 3 months"});

    Object.assign(translations.es, {"properties.chn1700.title": "Departamento 2 Ambientes Amoblado con Balcones en Las Cañitas", "properties.chn1700.modalTitle": "Alquiler Temporario – Departamento de 2 Ambientes Amoblado en Las Cañitas", "properties.chn1700.location": "Av. Gral. Indalecio Chenaut 1700 - Las Cañitas", "properties.chn1700.desc": "ALQUILER TEMPORARIO – DEPARTAMENTO DE 2 AMBIENTES AMOBLADO EN LAS CAÑITAS\n\n📍 Av. Gral. Indalecio Chenaut al 1700, CABA\n\nDisponibilidad: diciembre de 2026\n\nAlquiler mensual: USD 900 + luz y gas\n\nDuración del contrato: 3 meses\n\nCapacidad: 1 o 2 personas\n\nCaracterísticas del departamento\nDepartamento amoblado de 45 m² cubiertos, con dos balcones que suman 10 m². Ubicado en una zona residencial de Las Cañitas, ofrece comodidad, buena luminosidad y espacios exteriores para disfrutar de Buenos Aires.\n- 2 ambientes\n- 1 dormitorio con sommier de dos plazas y placard\n- Baño completo\n- Living comedor equipado\n- Aire acondicionado frío/calor\n- Cocina independiente totalmente equipada\n- Lavarropas\n- Balcón corrido en el living\n- Segundo balcón en el dormitorio\n- Vista panorámica\n- Calefacción central por losa radiante\n\nUbicación\nEn el barrio de Las Cañitas, con fácil acceso a las avenidas Libertador y Luis María Campos. Próximo a comercios, bares, restaurantes y parques, en un entorno residencial ideal para quienes buscan comodidad y conectividad.\n\nCondiciones del alquiler\n- Modalidad: temporario\n- Contrato: 3 meses\n- Alquiler mensual: USD 900\n- Servicios a cargo del inquilino: electricidad y gas\n- Disponible en diciembre de 2026\n\nConsultas y visitas\nContactá a LIMA INMOBILIARIA para consultar las condiciones del alquiler y coordinar una visita.", "properties.chn1700.price": "USD 900", "properties.chn1700.avail": "Disponible en diciembre de 2026", "properties.chn1700.term": "Contrato de 3 meses"});
    Object.assign(translations.pt, {"properties.chn1700.title": "Apartamento 2 Ambientes Mobiliado com Varandas em Las Cañitas", "properties.chn1700.modalTitle": "Aluguel Temporário – Apartamento de 2 Ambientes Mobiliado em Las Cañitas", "properties.chn1700.location": "Av. Gral. Indalecio Chenaut 1700 - Las Cañitas", "properties.chn1700.desc": "ALUGUEL TEMPORÁRIO – APARTAMENTO DE 2 AMBIENTES MOBILIADO EM LAS CAÑITAS\n\n📍 Av. Gral. Indalecio Chenaut 1700, CABA\n\nDisponibilidade: dezembro de 2026\n\nAluguel mensal: USD 900 + luz e gás\n\nDuração do contrato: 3 meses\n\nCapacidade: 1 ou 2 pessoas\n\nCaracterísticas do apartamento\nApartamento mobiliado de 45 m² cobertos, com duas varandas que somam 10 m². Em uma zona residencial de Las Cañitas, oferece conforto, boa luminosidade e espaços externos para aproveitar Buenos Aires.\n- 2 ambientes\n- 1 quarto com cama box de casal e armário\n- Banheiro completo\n- Sala de estar e jantar equipada\n- Ar-condicionado quente/frio\n- Cozinha independente totalmente equipada\n- Máquina de lavar roupa\n- Varanda corrida na sala\n- Segunda varanda no quarto\n- Vista panorâmica\n- Aquecimento central por piso radiante\n\nLocalização\nNo bairro de Las Cañitas, com fácil acesso às avenidas Libertador e Luis María Campos. Perto de comércios, bares, restaurantes e parques, em um ambiente residencial ideal para quem busca conforto e conectividade.\n\nCondições do aluguel\n- Modalidade: temporário\n- Contrato: 3 meses\n- Aluguel mensal: USD 900\n- Por conta do inquilino: eletricidade e gás\n- Disponível em dezembro de 2026\n\nConsultas e visitas\nFale com a LIMA INMOBILIARIA para consultar as condições do aluguel e agendar uma visita.", "properties.chn1700.price": "USD 900", "properties.chn1700.avail": "Disponível em dezembro de 2026", "properties.chn1700.term": "Contrato de 3 meses"});
    Object.assign(translations.en, {"properties.chn1700.title": "Furnished 2-Room Apartment with Balconies in Las Cañitas", "properties.chn1700.modalTitle": "Temporary Rental – Furnished 2-Room Apartment in Las Cañitas", "properties.chn1700.location": "Av. Gral. Indalecio Chenaut 1700 - Las Cañitas", "properties.chn1700.desc": "TEMPORARY RENTAL – FURNISHED 2-ROOM APARTMENT IN LAS CAÑITAS\n\n📍 Av. Gral. Indalecio Chenaut 1700, Buenos Aires City\n\nAvailability: December 2026\n\nMonthly rent: USD 900 + electricity and gas\n\nContract length: 3 months\n\nCapacity: 1 or 2 people\n\nApartment features\nFurnished apartment with 45 m² indoors and two balconies totaling 10 m². In a residential area of Las Cañitas, it offers comfort, plenty of light and outdoor spaces to enjoy Buenos Aires.\n- 2 rooms\n- 1 bedroom with a double box-spring bed and closet\n- Full bathroom\n- Equipped living and dining room\n- Hot/cold air conditioning\n- Separate, fully equipped kitchen\n- Washing machine\n- Long balcony in the living room\n- Second balcony in the bedroom\n- Panoramic view\n- Central heating through radiant floor\n\nLocation\nIn the Las Cañitas neighborhood, with easy access to Libertador and Luis María Campos avenues. Close to shops, bars, restaurants and parks, in a residential setting ideal for those who value comfort and connectivity.\n\nRental conditions\n- Type: temporary\n- Contract: 3 months\n- Monthly rent: USD 900\n- Tenant pays: electricity and gas\n- Available in December 2026\n\nInquiries and visits\nContact LIMA INMOBILIARIA to ask about the rental conditions and to arrange a visit.", "properties.chn1700.price": "USD 900", "properties.chn1700.avail": "Available December 2026", "properties.chn1700.term": "3-month contract"});

    Object.assign(translations.es, {"properties.tgb2800.title": "Departamento 4 Ambientes Amoblado con 3 Dormitorios en Belgrano", "properties.tgb2800.modalTitle": "Alquiler Temporario – Departamento de 4 Ambientes Amoblado en Belgrano", "properties.tgb2800.location": "Teodoro García 2800 - Belgrano", "properties.tgb2800.desc": "ALQUILER TEMPORARIO – DEPARTAMENTO DE 4 AMBIENTES AMOBLADO EN BELGRANO\n\n📍 Teodoro García al 2800, Belgrano, CABA\n\nAlquiler mensual: USD 1.100\n\nSuperficie total: 70 m²\n\nDormitorios: 3\n\nBaños: 1\n\nCaracterísticas del departamento\nAmplio y luminoso departamento de 4 ambientes, ubicado en un edificio de categoría en el barrio de Belgrano. Totalmente amoblado y equipado, es una excelente opción para quienes buscan comodidad, funcionalidad y espacio en una zona residencial de Buenos Aires.\n- 3 dormitorios con camas, colchones y placares empotrados\n- Baño completo reciclado a nuevo\n- Cocina independiente a gas\n- Heladera con freezer\n- Microondas, vajilla y utensilios de cocina\n- Lavadero propio con lavarropas\n- Aire acondicionado\n- Agua caliente y calefacción\n\nUbicación y conectividad\nUbicado sobre Teodoro García al 2800, con fácil acceso al transporte público, cerca de la estación de tren y de la estación Olleros de la línea D del subte. Una ubicación práctica para trasladarse por la ciudad y acceder a comercios y servicios.\n\nCondiciones del alquiler\nAlquiler mensual: USD 1.100\n\nIncluye:\n- Expensas\n- ABL\n\nServicios a cargo del inquilino:\n- Electricidad\n- Gas\n- AYSA\n- Internet\n\nConsultas y visitas\nContactá a LIMA INMOBILIARIA para consultar la disponibilidad y coordinar una visita.", "properties.tgb2800.price": "USD 1.100", "properties.tgb2800.term": "Expensas y ABL incluidos"});
    Object.assign(translations.pt, {"properties.tgb2800.title": "Apartamento 4 Ambientes Mobiliado com 3 Quartos em Belgrano", "properties.tgb2800.modalTitle": "Aluguel Temporário – Apartamento de 4 Ambientes Mobiliado em Belgrano", "properties.tgb2800.location": "Teodoro García 2800 - Belgrano", "properties.tgb2800.desc": "ALUGUEL TEMPORÁRIO – APARTAMENTO DE 4 AMBIENTES MOBILIADO EM BELGRANO\n\n📍 Teodoro García 2800, Belgrano, CABA\n\nAluguel mensal: USD 1.100\n\nÁrea total: 70 m²\n\nQuartos: 3\n\nBanheiros: 1\n\nCaracterísticas do apartamento\nApartamento amplo e iluminado de 4 ambientes, em um edifício de categoria no bairro de Belgrano. Totalmente mobiliado e equipado, é uma excelente opção para quem busca conforto, funcionalidade e espaço em uma zona residencial de Buenos Aires.\n- 3 quartos com camas, colchões e armários embutidos\n- Banheiro completo reformado como novo\n- Cozinha independente a gás\n- Geladeira com freezer\n- Micro-ondas, louça e utensílios de cozinha\n- Lavanderia própria com máquina de lavar roupa\n- Ar-condicionado\n- Água quente e aquecimento\n\nLocalização e conectividade\nNa Teodoro García 2800, com fácil acesso ao transporte público, perto da estação de trem e da estação Olleros da linha D do metrô. Uma localização prática para se deslocar pela cidade e acessar comércios e serviços.\n\nCondições do aluguel\nAluguel mensal: USD 1.100\n\nInclui:\n- Expensas (condomínio)\n- ABL (IPTU)\n\nPor conta do inquilino:\n- Eletricidade\n- Gás\n- AYSA (água)\n- Internet\n\nConsultas e visitas\nFale com a LIMA INMOBILIARIA para consultar a disponibilidade e agendar uma visita.", "properties.tgb2800.price": "USD 1.100", "properties.tgb2800.term": "Expensas e ABL incluídos"});
    Object.assign(translations.en, {"properties.tgb2800.title": "Furnished 4-Room Apartment with 3 Bedrooms in Belgrano", "properties.tgb2800.modalTitle": "Temporary Rental – Furnished 4-Room Apartment in Belgrano", "properties.tgb2800.location": "Teodoro García 2800 - Belgrano", "properties.tgb2800.desc": "TEMPORARY RENTAL – FURNISHED 4-ROOM APARTMENT IN BELGRANO\n\n📍 Teodoro García 2800, Belgrano, Buenos Aires City\n\nMonthly rent: USD 1,100\n\nTotal area: 70 m²\n\nBedrooms: 3\n\nBathrooms: 1\n\nApartment features\nSpacious, bright 4-room apartment in a quality building in the Belgrano neighborhood. Fully furnished and equipped, it is an excellent option for those looking for comfort, functionality and space in a residential area of Buenos Aires.\n- 3 bedrooms with beds, mattresses and built-in closets\n- Full bathroom, renovated like new\n- Separate gas kitchen\n- Fridge with freezer\n- Microwave, dishes and kitchen utensils\n- Own laundry area with washing machine\n- Air conditioning\n- Hot water and heating\n\nLocation and connectivity\nOn Teodoro García 2800, with easy access to public transport, near the train station and the Olleros station of subway line D. A practical location to get around the city and reach shops and services.\n\nRental conditions\nMonthly rent: USD 1,100\n\nIncluded:\n- Expensas (building fees)\n- ABL (property tax)\n\nTenant pays:\n- Electricity\n- Gas\n- AYSA (water)\n- Internet\n\nInquiries and visits\nContact LIMA INMOBILIARIA to ask about availability and to arrange a visit.", "properties.tgb2800.price": "USD 1,100", "properties.tgb2800.term": "Building fees & ABL included"});

    Object.assign(translations.es, {"properties.sl2400.title": "Monoambiente Equipado en Balvanera", "properties.sl2400.modalTitle": "Alquiler Temporario – Monoambiente en Balvanera", "properties.sl2400.location": "San Luis 2400 - Balvanera", "properties.sl2400.desc": "ALQUILER TEMPORARIO – MONOAMBIENTE EN BALVANERA\n\n📍 San Luis al 2400, Balvanera, CABA\n\nDisponible desde: 1 de noviembre de 2026\n\nAlquiler mensual: $720.000\n\nSuperficie total: 32 m²\n\nAmbientes: 1\n\nBaños: 1\n\nCaracterísticas del departamento\nCómodo monoambiente de 32 m², equipado para una estadía práctica en Buenos Aires. Cuenta con un amplio espacio de placard, mobiliario funcional y cocina equipada, ideal para quienes buscan comodidad y buena organización del espacio.\n- Monoambiente\n- Amplio espacio de placard\n- Heladera grande\n- Mesa con 4 sillas\n- Cocina completamente equipada\n- Baño completo\n\nCondiciones del alquiler\nAlquiler mensual: $720.000\n\nIncluye: servicios, excepto electricidad, cable e internet.\n\nA cargo del inquilino:\n- Electricidad\n- Cable\n- Internet\n\nDisponibilidad: a partir del 1 de noviembre de 2026.\n\nConsultas y visitas\nContactá a LIMA INMOBILIARIA para consultar las condiciones del alquiler y coordinar una visita.", "properties.sl2400.price": "$720.000", "properties.sl2400.avail": "Disponible desde el 1/11/2026", "properties.sl2400.term": "Servicios incluidos (ver detalle)"});
    Object.assign(translations.pt, {"properties.sl2400.title": "Monoambiente Equipado em Balvanera", "properties.sl2400.modalTitle": "Aluguel Temporário – Monoambiente em Balvanera", "properties.sl2400.location": "San Luis 2400 - Balvanera", "properties.sl2400.desc": "ALUGUEL TEMPORÁRIO – MONOAMBIENTE EM BALVANERA\n\n📍 San Luis 2400, Balvanera, CABA\n\nDisponível a partir de: 1º de novembro de 2026\n\nAluguel mensal: ARS 720.000\n\nÁrea total: 32 m²\n\nAmbientes: 1\n\nBanheiros: 1\n\nCaracterísticas do apartamento\nMonoambiente confortável de 32 m², equipado para uma estadia prática em Buenos Aires. Conta com amplo espaço de armário, mobiliário funcional e cozinha equipada, ideal para quem busca conforto e boa organização do espaço.\n- Monoambiente\n- Amplo espaço de armário\n- Geladeira grande\n- Mesa com 4 cadeiras\n- Cozinha completamente equipada\n- Banheiro completo\n\nCondições do aluguel\nAluguel mensal: ARS 720.000\n\nInclui: serviços, exceto eletricidade, TV a cabo e internet.\n\nPor conta do inquilino:\n- Eletricidade\n- TV a cabo\n- Internet\n\nDisponibilidade: a partir de 1º de novembro de 2026.\n\nConsultas e visitas\nFale com a LIMA INMOBILIARIA para consultar as condições do aluguel e agendar uma visita.", "properties.sl2400.price": "ARS 720.000", "properties.sl2400.avail": "Disponível a partir de 1/11/2026", "properties.sl2400.term": "Serviços incluídos (ver detalhes)"});
    Object.assign(translations.en, {"properties.sl2400.title": "Equipped Studio Apartment in Balvanera", "properties.sl2400.modalTitle": "Temporary Rental – Studio Apartment in Balvanera", "properties.sl2400.location": "San Luis 2400 - Balvanera", "properties.sl2400.desc": "TEMPORARY RENTAL – STUDIO APARTMENT IN BALVANERA\n\n📍 San Luis 2400, Balvanera, Buenos Aires City\n\nAvailable from: November 1, 2026\n\nMonthly rent: ARS 720,000\n\nTotal area: 32 m²\n\nRooms: 1\n\nBathrooms: 1\n\nApartment features\nComfortable 32 m² studio apartment, equipped for a practical stay in Buenos Aires. It has plenty of closet space, functional furniture and an equipped kitchen, ideal for those looking for comfort and a well-organized space.\n- Studio apartment\n- Plenty of closet space\n- Large fridge\n- Table with 4 chairs\n- Fully equipped kitchen\n- Full bathroom\n\nRental conditions\nMonthly rent: ARS 720,000\n\nIncluded: utilities, except electricity, cable and internet.\n\nTenant pays:\n- Electricity\n- Cable\n- Internet\n\nAvailability: from November 1, 2026.\n\nInquiries and visits\nContact LIMA INMOBILIARIA to ask about the rental conditions and to arrange a visit.", "properties.sl2400.price": "ARS 720,000", "properties.sl2400.avail": "Available from Nov 1, 2026", "properties.sl2400.term": "Utilities included (see details)"});

    function applyTranslations(lang) {
        const dict = translations[lang] || translations.es;
        document.documentElement.lang = ({ pt: 'pt-BR', en: 'en' })[lang] || 'es';
        // Update text/HTML for items with data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (!key) return;
            if (dict[key]) {
                let value = dict[key];
                // Render HTML safely for trusted translation strings that include tags
                if (/<[^>]+>/.test(value)) {
                    el.innerHTML = value;
                } else {
                    el.textContent = value;
                }
            }
        });

        // Update placeholders for inputs/textareas with data-i18n-placeholder
        document.querySelectorAll('[data-i18n-placeholder]').forEach(inp => {
            const key = inp.getAttribute('data-i18n-placeholder');
            if (key && dict[key]) inp.placeholder = dict[key];
        });

        // Update translated modal attributes for each property card button
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (key && dict[key]) el.setAttribute('data-title', dict[key]);
        });

        document.querySelectorAll('[data-i18n-location]').forEach(el => {
            const key = el.getAttribute('data-i18n-location');
            if (key && dict[key]) el.setAttribute('data-location', dict[key]);
        });

        document.querySelectorAll('[data-i18n-desc]').forEach(el => {
            const key = el.getAttribute('data-i18n-desc');
            if (key && dict[key]) el.setAttribute('data-desc', dict[key]);
        });

        updateYearSpans();

        // Keep bed/bath label grammar correct for singular/plural in current language.
        const currentBeds = modalBedsValue ? parseCount(modalBedsValue.textContent) : 0;
        const currentBaths = modalBathsValue ? parseCount(modalBathsValue.textContent) : 0;
        updateModalFeatureLabels(currentBeds, currentBaths, lang);

        // Update language cycle UI (flag + code)
        if (langCycle) {
            const flag = ({ pt: 'BR', en: 'US' })[lang] || 'AR';
            const code = ({ pt: 'PT', en: 'EN' })[lang] || 'ES';
            const flagEl = langCycle.querySelector('.lang-flag');
            const codeEl = langCycle.querySelector('.lang-code');
            if (flagEl) flagEl.textContent = flag;
            if (codeEl) codeEl.textContent = code;
            if (langMenuBtn) langMenuBtn.setAttribute('aria-expanded', 'false');
        }

        normalizeMojibakeInDom(document);
        localStorage.setItem('site-lang', lang);
    }

    // Initialize language from localStorage or default to 'es'
    const initialLang = localStorage.getItem('site-lang') || 'es';
    applyTranslations(initialLang);
    updateYearSpans();

    // Language cycle (click flag to toggle language) and dropdown behavior
    if (langCycle) {
        langCycle.addEventListener('click', () => {
            const current = localStorage.getItem('site-lang') || 'es';
            const next = ({ es: 'pt', pt: 'en', en: 'es' })[current] || 'es';
            applyTranslations(next);
        });
    }

    if (langMenuBtn && langMenu) {
        langMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = langMenu.classList.contains('open');
            if (isOpen) {
                langMenu.classList.remove('open');
                langMenuBtn.setAttribute('aria-expanded', 'false');
            } else {
                langMenu.classList.add('open');
                langMenuBtn.setAttribute('aria-expanded', 'true');
            }
        });

        // Click on language option inside dropdown
        langMenu.querySelectorAll('li[data-lang]').forEach(li => {
            li.addEventListener('click', () => {
                const chosen = li.getAttribute('data-lang');
                applyTranslations(chosen);
                langMenu.classList.remove('open');
                langMenuBtn.setAttribute('aria-expanded', 'false');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (ev) => {
            if (!langMenu.contains(ev.target) && !langMenuBtn.contains(ev.target) && !langCycle.contains(ev.target)) {
                langMenu.classList.remove('open');
                if (langMenuBtn) langMenuBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    if (navToggle && navbar) {
        navToggle.setAttribute('aria-expanded', 'false');

        navToggle.addEventListener('click', function() {
            const isOpen = navbar.classList.toggle('open');
            navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        // Fechar menu ao clicar em um item
        document.querySelectorAll('.navbar nav ul li a').forEach(a => {
            a.addEventListener('click', () => {
                navbar.classList.remove('open');
                navToggle.setAttribute('aria-expanded', 'false');
            });
        });

        // Fechar menu quando clicar fora da navbar
        document.addEventListener('click', (event) => {
            if (window.innerWidth <= 900 && !navbar.contains(event.target)) {
                navbar.classList.remove('open');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        });

        // On resize, close or reposition as needed
        window.addEventListener('resize', () => {
            if (window.innerWidth > 900) {
                navbar.classList.remove('open');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }
});



/* ===== Búsqueda avanzada ===== */
document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('advSearch');
    const grid = document.querySelector('.properties-grid');
    if (!root || !grid) return;

    // Para alertas por email automáticas, pegá acá el endpoint de tu servicio (Formspree, Make, Zapier, Supabase, etc.).
    // Recibe un POST JSON { email, alerts, url, filters }. Si queda vacío, se pide confirmar por WhatsApp.
    const ALERTS_ENDPOINT = '';
    const WA = '5491127858950';
    const SAVED_KEY = 'lima-saved-searches';

    const D = {
        title:['Buscá tu propiedad','Busque seu imóvel','Find your property'],
        aria:['Búsqueda avanzada de propiedades','Busca avançada de imóveis','Advanced property search'],
        op:['Operación','Operação','Deal type'], allF:['Todas','Todas','All'], allM:['Todos','Todos','All'],
        op_tradicional:['Alquiler tradicional','Aluguel tradicional','Traditional rental'], op_temporario:['Temporario','Temporário','Temporary'], op_venta:['Venta','Venda','Sale'],
        prop:['Tipo de propiedad','Tipo de imóvel','Property type'],
        p_departamento:['Departamento','Apartamento','Apartment'], p_casa:['Casa','Casa','House'], p_oficina:['Oficina','Escritório','Office'], p_local:['Local','Loja','Commercial space'],
        hood:['Barrio','Bairro','Neighborhood'], allHoods:['Todos los barrios','Todos os bairros','All neighborhoods'], hoodN:['barrios','bairros','neighborhoods'],
        hoodSearch:['Buscar barrio…','Buscar bairro…','Search neighborhood…'], noRes:['Sin resultados','Sem resultados','No results'],
        price:['Precio','Preço','Price'], min:['Mín.','Mín.','Min'], max:['Máx.','Máx.','Max'], pmin:['Precio mínimo','Preço mínimo','Minimum price'], pmax:['Precio máximo','Preço máximo','Maximum price'],
        beds:['Dormitorios','Quartos','Bedrooms'], baths:['Baños','Banheiros','Bathrooms'], any:['Cualquiera','Qualquer','Any'], studio:['Monoambiente','Studio','Studio'],
        more:['Más filtros','Mais filtros','More filters'], less:['Menos filtros','Menos filtros','Fewer filters'],
        m2:['Superficie (m²)','Área (m²)','Area (m²)'], amen:['Amenities','Comodidades','Amenities'],
        a_piscina:['Piscina','Piscina','Pool'], a_gym:['Gimnasio','Academia','Gym'], a_seguridad:['Seguridad 24 h','Segurança 24 h','24-hour security'], a_pet:['Pet-friendly','Aceita pets','Pet-friendly'],
        age:['Antigüedad','Idade do imóvel','Property age'], age_new:['A estrenar','Novo','Brand new'], age_5:['Hasta 5 años','Até 5 anos','Up to 5 years'], age_10:['5 a 10 años','5 a 10 anos','5 to 10 years'], age_20:['10 a 20 años','10 a 20 anos','10 to 20 years'], age_20p:['Más de 20 años','Mais de 20 anos','Over 20 years'],
        orient:['Orientación solar','Orientação solar','Sun orientation'], o_norte:['Norte','Norte','North'], o_sur:['Sur','Sul','South'], o_este:['Este','Leste','East'], o_oeste:['Oeste','Oeste','West'],
        noData:['Todavía ningún inmueble informa este dato','Nenhum imóvel informa este dado ainda','No listing reports this yet'],
        search:['Buscar','Buscar','Search'], clear:['Limpiar filtros','Limpar filtros','Clear filters'], save:['Guardar búsqueda','Salvar busca','Save search'], share:['Compartir','Compartilhar','Share'],
        saved:['Búsquedas guardadas','Buscas salvas','Saved searches'], savedEmpty:['Todavía no guardaste búsquedas.','Você ainda não salvou buscas.',"You haven't saved any searches yet."],
        apply:['Aplicar','Aplicar','Apply'], del:['Eliminar','Excluir','Delete'], copied:['Enlace copiado','Link copiado','Link copied'], close:['Cerrar','Fechar','Close'],
        show:['Mostrando','Mostrando','Showing'], one:['inmueble','imóvel','property'], many:['inmuebles','imóveis','properties'],
        none:['No hay inmuebles con estos filtros por ahora.','Não há imóveis com estes filtros no momento.','No properties match these filters right now.'],
        soon:['Estamos actualizando nuestros inmuebles disponibles. Consultanos por WhatsApp y te contamos qué hay.','Estamos atualizando nossos imóveis disponíveis. Consulte-nos pelo WhatsApp e contamos o que há.','We are updating our available properties. Message us on WhatsApp and we will tell you what is available.'],
        cta:['Consultanos por WhatsApp','Consulte-nos pelo WhatsApp','Message us on WhatsApp'],
        curNote:['Con el precio filtrado en {c}, solo se muestran inmuebles publicados en {c}.','Com o preço filtrado em {c}, aparecem só imóveis anunciados em {c}.','With the price filtered in {c}, only listings priced in {c} are shown.'],
        m2Note:['Los inmuebles que no informan m² quedan fuera.','Imóveis que não informam m² ficam de fora.','Listings that do not report m² are excluded.'],
        ssTitle:['Guardar esta búsqueda','Salvar esta busca','Save this search'], ssEmail:['Tu email','Seu e-mail','Your email'],
        ssAlerts:['Avisarme por email cuando haya nuevos inmuebles que coincidan','Avisar por e-mail quando houver novos imóveis compatíveis','Email me when new matching properties appear'],
        ssConsent:['Acepto que Lima Inmobiliaria use mi email para enviarme estas alertas.','Aceito que a Lima Inmobiliaria use meu e-mail para enviar esses alertas.','I agree that Lima Inmobiliaria may use my email to send these alerts.'],
        cancel:['Cancelar','Cancelar','Cancel'], saveBtn:['Guardar','Salvar','Save'], ok:['Listo','Pronto','Done'],
        errEmail:['Ingresá un email válido.','Informe um e-mail válido.','Enter a valid email.'], errConsent:['Necesitamos tu autorización para enviarte alertas.','Precisamos da sua autorização para enviar alertas.','We need your permission to send alerts.'],
        done:['Búsqueda guardada en este dispositivo.','Busca salva neste dispositivo.','Search saved on this device.'],
        waMsg:['Para activar las alertas por email, confirmalo por WhatsApp:','Para ativar os alertas por e-mail, confirme pelo WhatsApp:','To activate email alerts, confirm via WhatsApp:'],
        ssWa:['Confirmar por WhatsApp','Confirmar pelo WhatsApp','Confirm via WhatsApp'], allListings:['Todos los inmuebles','Todos os imóveis','All properties'], amb:['amb.','amb.','rooms']
    };
    const LI = () => ({ es: 0, pt: 1, en: 2 })[getCurrentSiteLang()] ?? 0;
    const t = (k) => (D[k] || [k])[LI()] ?? k;
    const LOC = () => ['es-AR', 'pt-BR', 'en-US'][LI()];
    const fmt = (n) => new Intl.NumberFormat(LOC()).format(n);
    const $ = (s, r = root) => r.querySelector(s);
    const $$ = (s, r = root) => [...r.querySelectorAll(s)];
    const ov = document.getElementById('ssOverlay');

    // ---- datos de los inmuebles (leídos del HTML)
    const num = (v) => (v === undefined || v === '' ? null : Number(v));
    const cards = [...grid.querySelectorAll('.property-card')].map((el) => {
        const d = el.dataset, b = (el.querySelector('.btn-card') || {}).dataset || {};
        const set = (s) => new Set((s || '').split(' ').filter(Boolean));
        return { el, op: d.op, amb: d.type, prop: d.prop || 'departamento', hood: d.hood || '', hoodLabel: d.hoodLabel || '', price: num(d.price), cur: d.cur || '',
            beds: num(b.beds), baths: num(b.baths), m2: num(d.m2), amen: set(d.amen), age: num(d.age), orient: set(d.orient) };
    });
    const hoodMap = new Map();
    cards.forEach((c) => { if (c.hood) { const h = hoodMap.get(c.hood) || { label: c.hoodLabel || c.hood, n: 0 }; h.n++; hoodMap.set(c.hood, h); } });

    // ---- estado
    const blank = () => ({ op: '', prop: '', amb: '', hoods: [], cur: 'ars', pmin: '', pmax: '', beds: '', baths: '', m2min: '', m2max: '', amen: [], age: '', orient: [] });
    let S = blank();
    const digits = (v) => String(v || '').replace(/\D/g, '');
    const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const match = (c) => {
        if (S.op && c.op !== S.op) return false;
        if (S.prop && c.prop !== S.prop) return false;
        if (S.amb && c.amb !== S.amb) return false;
        if (S.hoods.length && !S.hoods.includes(c.hood)) return false;
        if (S.pmin !== '' || S.pmax !== '') {
            if (c.price === null || c.cur !== S.cur) return false;
            if (S.pmin !== '' && c.price < +S.pmin) return false;
            if (S.pmax !== '' && c.price > +S.pmax) return false;
        }
        if (S.beds !== '') { if (c.beds === null) return false; if (S.beds === '4' ? c.beds < 4 : c.beds !== +S.beds) return false; }
        if (S.baths !== '') { if (c.baths === null) return false; if (S.baths === '3' ? c.baths < 3 : c.baths !== +S.baths) return false; }
        if (S.m2min !== '' || S.m2max !== '') {
            if (c.m2 === null) return false;
            if (S.m2min !== '' && c.m2 < +S.m2min) return false;
            if (S.m2max !== '' && c.m2 > +S.m2max) return false;
        }
        if (S.amen.length && !S.amen.every((a) => c.amen.has(a))) return false;
        if (S.age !== '') {
            if (c.age === null) return false;
            const a = c.age;
            const ok = { new: a === 0, 5: a <= 5, 10: a > 5 && a <= 10, 20: a > 10 && a <= 20, '20p': a > 20 }[S.age];
            if (!ok) return false;
        }
        if (S.orient.length && !S.orient.some((o) => c.orient.has(o))) return false;
        return true;
    };
    const isActive = () => JSON.stringify(S) !== JSON.stringify(blank());

    // ---- resultados
    const countEl = document.getElementById('filterCount'), emptyEl = document.getElementById('filterEmpty'), hintEl = document.getElementById('filterHint');
    const apply = () => {
        let n = 0;
        cards.forEach((c) => { const ok = match(c); c.el.hidden = !ok; if (ok) n++; });
        countEl.textContent = n ? `${t('show')} ${n} ${n === 1 ? t('one') : t('many')}` : '';
        emptyEl.hidden = n !== 0;
        emptyEl.innerHTML = `<p>${isActive() ? t('none') : t('soon')}</p><a href="https://wa.me/${WA}" target="_blank" rel="noopener noreferrer">${t('cta')}</a>`;
        const notes = [];
        if (S.pmin !== '' || S.pmax !== '') notes.push(t('curNote').replace(/\{c\}/g, S.cur.toUpperCase()));
        if (S.m2min !== '' || S.m2max !== '') notes.push(t('m2Note'));
        hintEl.textContent = notes.join(' ');
        syncChips();
    };

    // ---- chips del hero (atajos)
    const chipPanel = document.querySelector('.filter-panel');
    const syncChips = () => {
        if (!chipPanel) return;
        const opKey = S.op || 'all', tyKey = (S.prop === 'oficina' || S.prop === 'local') ? S.prop : (S.amb || 'all');
        chipPanel.querySelectorAll('.filter-chip').forEach((x) => {
            const on = x.dataset.filter === (x.dataset.group === 'op' ? opKey : tyKey);
            x.classList.toggle('active', on); x.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    };
    if (chipPanel) chipPanel.addEventListener('click', (e) => {
        const b = e.target.closest('.filter-chip'); if (!b) return;
        const v = b.dataset.filter;
        if (b.dataset.group === 'op') S.op = v === 'all' ? '' : v;
        else if (v === 'all') { S.amb = ''; if (S.prop === 'oficina' || S.prop === 'local') S.prop = ''; }
        else if (v === 'oficina' || v === 'local') { S.prop = v; S.amb = ''; }
        else { S.amb = v; if (S.prop === 'oficina' || S.prop === 'local') S.prop = ''; }
        writeFields(); apply(); updateUrl(); toResults();
    });

    // ---- campos <-> estado
    const fOp = $('#fOp'), fProp = $('#fProp'), fPmin = $('#fPmin'), fPmax = $('#fPmax'), fBeds = $('#fBeds'), fBaths = $('#fBaths'), fM2min = $('#fM2min'), fM2max = $('#fM2max'), fAge = $('#fAge');
    const fmtInput = (el) => { const d = digits(el.value); el.value = d ? fmt(+d) : ''; };
    [fPmin, fPmax, fM2min, fM2max].forEach((el) => el.addEventListener('blur', () => fmtInput(el)));
    const readFields = () => {
        S = { ...S, op: fOp.value, prop: fProp.value, hoods: $$('#msList input:checked').map((i) => i.value),
            cur: ($('input[name=cur]:checked') || {}).value || 'ars', pmin: digits(fPmin.value), pmax: digits(fPmax.value),
            beds: fBeds.value, baths: fBaths.value, m2min: digits(fM2min.value), m2max: digits(fM2max.value), age: fAge.value,
            amen: $$('input[name=amen]:checked').map((i) => i.value), orient: $$('input[name=orient]:checked').map((i) => i.value) };
        if (S.prop === 'oficina' || S.prop === 'local') S.amb = '';
    };
    const writeFields = () => {
        fOp.value = S.op; fProp.value = S.prop; fBeds.value = S.beds; fBaths.value = S.baths; fAge.value = S.age;
        fPmin.value = S.pmin !== '' ? fmt(+S.pmin) : ''; fPmax.value = S.pmax !== '' ? fmt(+S.pmax) : '';
        fM2min.value = S.m2min !== '' ? fmt(+S.m2min) : ''; fM2max.value = S.m2max !== '' ? fmt(+S.m2max) : '';
        $$('input[name=cur]').forEach((r) => { r.checked = r.value === S.cur; });
        $$('#msList input').forEach((i) => { i.checked = S.hoods.includes(i.value); });
        $$('input[name=amen]').forEach((i) => { i.checked = S.amen.includes(i.value); });
        $$('input[name=orient]').forEach((i) => { i.checked = S.orient.includes(i.value); });
        hoodLabel();
    };

    // ---- barrios (multi-selección con búsqueda)
    const msBtn = $('#msBtn'), msPanel = $('#msPanel'), msList = $('#msList'), msSearch = $('#msSearch');
    [...hoodMap.entries()].sort((a, b) => a[1].label.localeCompare(b[1].label)).forEach(([slug, h]) => {
        const li = document.createElement('li'); li.dataset.name = norm(h.label);
        li.innerHTML = '<label class="chk"><input type="checkbox"><span class="nm"></span><span class="ct"></span></label>';
        li.querySelector('input').value = slug; li.querySelector('.nm').textContent = h.label; li.querySelector('.ct').textContent = `(${h.n})`;
        msList.appendChild(li);
    });
    const hoodLabel = () => {
        const sel = $$('#msList input:checked');
        $('#msLabel').textContent = !sel.length ? t('allHoods') : sel.length === 1 ? (hoodMap.get(sel[0].value) || {}).label : `${sel.length} ${t('hoodN')}`;
    };
    const msToggle = (open) => { msPanel.hidden = !open; msBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); if (open) { msSearch.value = ''; filterHoods(); msSearch.focus(); } };
    const filterHoods = () => {
        const q = norm(msSearch.value.trim()); let shown = 0;
        $$('#msList li').forEach((li) => { const ok = !q || li.dataset.name.includes(q); li.hidden = !ok; if (ok) shown++; });
        $('#msEmpty').hidden = shown !== 0;
    };
    msBtn.addEventListener('click', () => msToggle(msPanel.hidden));
    msSearch.addEventListener('input', filterHoods);
    msList.addEventListener('change', hoodLabel);
    document.addEventListener('click', (e) => { if (!msPanel.hidden && !e.target.closest('#msHood')) msToggle(false); });
    $('#msHood').addEventListener('keydown', (e) => { if (e.key === 'Escape' && !msPanel.hidden) { msToggle(false); msBtn.focus(); } });

    // ---- "Más filtros" (acordeón)
    const moreBtn = $('#moreBtn'), morePanel = $('#morePanel');
    const moreOpen = (open) => { morePanel.hidden = !open; moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); moreBtn.classList.toggle('open', open); moreBtn.querySelector('span').textContent = t(open ? 'less' : 'more'); };
    moreBtn.addEventListener('click', () => moreOpen(morePanel.hidden));

    // ---- campos sin datos: se deshabilitan
    const present = { amen: new Set(), orient: new Set(), age: cards.some((c) => c.age !== null) };
    cards.forEach((c) => { c.amen.forEach((a) => present.amen.add(a)); c.orient.forEach((o) => present.orient.add(o)); });
    const markAvail = () => {
        const dis = (el, off) => { el.disabled = off; const w = el.closest('label') || el.parentElement; w.classList.toggle('is-off', off); w.title = off ? t('noData') : ''; };
        $$('input[name=amen]').forEach((i) => dis(i, !present.amen.has(i.value)));
        $$('input[name=orient]').forEach((i) => dis(i, !present.orient.has(i.value)));
        dis(fAge, !present.age);
    };

    // ---- URL amigable
    const OPQ = { tradicional: 'alquiler', temporario: 'temporario', venta: 'venta' }, OPR = { alquiler: 'tradicional', temporario: 'temporario', venta: 'venta' };
    const AMQ = { pet: 'pet-friendly', seguridad: 'seguridad', gym: 'gym', piscina: 'piscina' }, AMR = { 'pet-friendly': 'pet', seguridad: 'seguridad', gym: 'gym', piscina: 'piscina' };
    const toParams = () => {
        const p = new URLSearchParams();
        if (S.op) p.set('operacion', OPQ[S.op]); if (S.prop) p.set('tipo', S.prop); if (S.amb) p.set('ambientes', S.amb);
        if (S.hoods.length) p.set('barrio', S.hoods.join(','));
        if (S.pmin !== '' || S.pmax !== '') p.set('moneda', S.cur);
        if (S.pmin !== '') p.set('precio-min', S.pmin); if (S.pmax !== '') p.set('precio-max', S.pmax);
        if (S.beds !== '') p.set('dormitorios', S.beds); if (S.baths !== '') p.set('banos', S.baths);
        if (S.m2min !== '') p.set('m2-min', S.m2min); if (S.m2max !== '') p.set('m2-max', S.m2max);
        if (S.amen.length) p.set('amenities', S.amen.map((a) => AMQ[a]).join(','));
        if (S.age !== '') p.set('antiguedad', S.age); if (S.orient.length) p.set('orientacion', S.orient.join(','));
        return p;
    };
    const fromParams = (p) => {
        const n = blank(), g = (k) => p.get(k) || '', list = (k) => g(k).split(',').map((x) => x.trim()).filter(Boolean);
        if (OPR[g('operacion')]) n.op = OPR[g('operacion')];
        if (['departamento', 'casa', 'oficina', 'local'].includes(g('tipo'))) n.prop = g('tipo');
        if (/^[1-5]$/.test(g('ambientes'))) n.amb = g('ambientes');
        n.hoods = list('barrio').filter((h) => hoodMap.has(h));
        if (g('moneda') === 'usd') n.cur = 'usd';
        if (/^\d+$/.test(g('precio-min'))) n.pmin = g('precio-min'); if (/^\d+$/.test(g('precio-max'))) n.pmax = g('precio-max');
        if (/^[0-4]$/.test(g('dormitorios'))) n.beds = g('dormitorios'); if (/^[1-3]$/.test(g('banos'))) n.baths = g('banos');
        if (/^\d+$/.test(g('m2-min'))) n.m2min = g('m2-min'); if (/^\d+$/.test(g('m2-max'))) n.m2max = g('m2-max');
        n.amen = list('amenities').map((a) => AMR[a]).filter(Boolean);
        if (['new', '5', '10', '20', '20p'].includes(g('antiguedad'))) n.age = g('antiguedad');
        n.orient = list('orientacion').filter((o) => ['norte', 'sur', 'este', 'oeste'].includes(o));
        return n;
    };
    const updateUrl = () => { try { const q = toParams().toString(); history.replaceState(null, '', location.pathname + (q ? `?${q}` : '') + location.hash); } catch (e) { /* sin history */ } };
    const shareUrl = () => {
        const base = location.hostname.endsWith('limainmobiliariaofc.com') ? `${location.origin}/propiedades` : location.origin + location.pathname;
        const q = toParams().toString(); return base + (q ? `?${q}` : '');
    };
    const toResults = () => { const r = countEl.getBoundingClientRect(); if (r.top > innerHeight * 0.65 || r.top < 0) countEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

    // ---- botones
    const commit = () => { readFields(); apply(); updateUrl(); toResults(); };
    $('#bSearch').addEventListener('click', commit);
    root.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox' && e.target.type !== 'radio' && e.target.id !== 'msSearch') { e.preventDefault(); commit(); } });
    $('#bClear').addEventListener('click', () => { S = blank(); writeFields(); apply(); updateUrl(); });
    const live = $('#advLive');
    $('#bShare').addEventListener('click', async () => {
        readFields(); const u = shareUrl();
        try { await navigator.clipboard.writeText(u); }
        catch (e) { const ta = document.createElement('textarea'); ta.value = u; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (er) { /* manual */ } ta.remove(); }
        live.textContent = `${t('copied')}: ${u}`; clearTimeout(live._t); live._t = setTimeout(() => { live.textContent = ''; }, 3500);
    });

    // ---- resumen legible
    const summary = (s = S) => {
        const p = [];
        if (s.op) p.push(t(`op_${s.op}`)); if (s.prop) p.push(t(`p_${s.prop}`)); if (s.amb) p.push(`${s.amb} ${t('amb')}`);
        if (s.hoods.length) p.push(s.hoods.map((h) => (hoodMap.get(h) || {}).label || h).join(', '));
        if (s.pmin !== '' || s.pmax !== '') p.push(`${s.cur.toUpperCase()} ${s.pmin !== '' ? fmt(+s.pmin) : '…'}–${s.pmax !== '' ? fmt(+s.pmax) : '…'}`);
        if (s.beds !== '') p.push(`${t('beds')}: ${s.beds === '0' ? t('studio') : s.beds === '4' ? '4+' : s.beds}`);
        if (s.baths !== '') p.push(`${t('baths')}: ${s.baths === '3' ? '3+' : s.baths}`);
        if (s.m2min !== '' || s.m2max !== '') p.push(`m² ${s.m2min || '…'}–${s.m2max || '…'}`);
        if (s.amen.length) p.push(s.amen.map((a) => t(`a_${a}`)).join(', '));
        if (s.age !== '') p.push(t(`age_${s.age}`)); if (s.orient.length) p.push(s.orient.map((o) => t(`o_${o}`)).join(', '));
        return p.join(' · ') || t('allListings');
    };

    // ---- búsquedas guardadas
    const loadSaved = () => { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); } catch (e) { return []; } };
    const storeSaved = (a) => { try { localStorage.setItem(SAVED_KEY, JSON.stringify(a)); } catch (e) { /* sin storage */ } };
    const savedBtn = $('#savedBtn'), savedList = $('#savedList');
    const renderSaved = () => {
        const a = loadSaved(); $('#savedN').textContent = a.length; savedList.innerHTML = '';
        if (!a.length) { const li = document.createElement('li'); li.className = 'saved-empty'; li.textContent = t('savedEmpty'); savedList.appendChild(li); return; }
        a.forEach((s) => {
            const li = document.createElement('li'); const name = document.createElement('span'); name.className = 'sv-name';
            name.textContent = summary(fromParams(new URLSearchParams(s.qs)));
            const ap = document.createElement('button'); ap.type = 'button'; ap.className = 'link-btn'; ap.textContent = t('apply');
            ap.addEventListener('click', () => { S = fromParams(new URLSearchParams(s.qs)); writeFields(); apply(); updateUrl(); toResults(); });
            const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'link-btn danger'; rm.textContent = t('del');
            rm.addEventListener('click', () => { storeSaved(loadSaved().filter((x) => x.id !== s.id)); renderSaved(); });
            li.append(name, ap, rm); savedList.appendChild(li);
        });
    };
    savedBtn.addEventListener('click', () => { const open = savedList.hidden; savedList.hidden = !open; savedBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); });

    // ---- diálogo "Guardar búsqueda"
    const ssForm = document.getElementById('ssForm'), ssDone = document.getElementById('ssDone'), ssErr = document.getElementById('ssError');
    const ssEmail = document.getElementById('ssEmail'), ssAlerts = document.getElementById('ssAlerts'), ssConsent = document.getElementById('ssConsent');
    let lastFocus = null;
    const ssOpen = () => {
        readFields(); lastFocus = document.activeElement; document.getElementById('ssSummary').textContent = summary();
        ssForm.hidden = false; ssDone.hidden = true; ssErr.hidden = true; ssConsent.checked = false; ssOv(true); ssEmail.focus();
    };
    const ssOv = (open) => { ov.hidden = !open; document.body.classList.toggle('modal-open', open); if (!open && lastFocus) lastFocus.focus(); };
    $('#bSave').addEventListener('click', ssOpen);
    ['ssClose', 'ssCancel', 'ssOk'].forEach((id) => document.getElementById(id).addEventListener('click', () => ssOv(false)));
    ov.addEventListener('click', (e) => { if (e.target === ov) ssOv(false); });
    ov.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { ssOv(false); return; }
        if (e.key !== 'Tab') return;
        const f = [...ov.querySelectorAll('button,input,a[href]')].filter((x) => !x.disabled && x.offsetParent !== null);
        if (!f.length) return; const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    document.getElementById('ssSubmit').addEventListener('click', async () => {
        const email = ssEmail.value.trim(), ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
        const err = (k) => { ssErr.textContent = t(k); ssErr.hidden = false; };
        if (!ok) { err('errEmail'); ssEmail.focus(); return; }
        if (ssAlerts.checked && !ssConsent.checked) { err('errConsent'); ssConsent.focus(); return; }
        ssErr.hidden = true;
        const qs = toParams().toString(), entry = { id: Date.now().toString(36), qs, email, alerts: ssAlerts.checked, t: new Date().toISOString() };
        storeSaved([entry, ...loadSaved()].slice(0, 20)); renderSaved();
        let sent = false;
        if (ALERTS_ENDPOINT) { try { const r = await fetch(ALERTS_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, alerts: entry.alerts, url: shareUrl(), filters: S }) }); sent = r.ok; } catch (e) { sent = false; } }
        document.getElementById('ssDoneMsg').textContent = t('done');
        const needWa = entry.alerts && !sent; document.getElementById('ssWaMsg').hidden = !needWa; document.getElementById('ssWa').hidden = !needWa;
        document.getElementById('ssWaMsg').textContent = t('waMsg');
        const msg = `Hola, quiero activar alertas por email de nuevos inmuebles.\nEmail: ${email}\nBúsqueda: ${shareUrl()}`;
        document.getElementById('ssWa').href = `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
        ssForm.hidden = true; ssDone.hidden = false;
    });

    // ---- idioma
    const applyLang = () => {
        const i = LI();
        $$('[data-sf]', document).forEach((el) => { el.textContent = (D[el.dataset.sf] || [])[i] ?? el.textContent; });
        $$('[data-sf-ph]', document).forEach((el) => { el.placeholder = (D[el.dataset.sfPh] || [])[i] ?? el.placeholder; });
        $$('[data-sf-aria]', document).forEach((el) => { el.setAttribute('aria-label', (D[el.dataset.sfAria] || [])[i] ?? el.getAttribute('aria-label')); });
        moreBtn.querySelector('span').textContent = t(morePanel.hidden ? 'more' : 'less');
        hoodLabel(); markAvail(); renderSaved();
        document.getElementById('ssSummary').textContent = ov.hidden ? '' : summary();
        document.getElementById('ssWaMsg').textContent = t('waMsg');
    };
    document.addEventListener('click', (e) => { if (e.target.closest('#langMenu li, #langCycle')) setTimeout(() => { applyLang(); apply(); }, 90); });

    // ---- arranque
    applyLang();
    const initial = new URLSearchParams(location.search);
    if ([...initial.keys()].length) {
        S = fromParams(initial); writeFields();
        if (S.m2min || S.m2max || S.amen.length || S.age || S.orient.length) moreOpen(true);
        apply(); setTimeout(toResults, 400);
    } else { apply(); }
});

/* ===== Favoritos (coração) ===== */
document.addEventListener('DOMContentLoaded', () => {
    const KEY = 'lima-favs';
    let favs = [];
    try { favs = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { favs = []; }
    const L = { es: ['Guardar en favoritos', 'Quitar de favoritos'], pt: ['Salvar nos favoritos', 'Remover dos favoritos'], en: ['Save to favorites', 'Remove from favorites'] };
    const btns = [...document.querySelectorAll('.fav-btn')];
    const paint = () => {
        const t = L[getCurrentSiteLang()] || L.es;
        btns.forEach((b) => {
            const on = favs.includes(b.closest('.property-card').dataset.id);
            b.classList.toggle('active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
            b.setAttribute('aria-label', t[on ? 1 : 0]);
            b.title = t[on ? 1 : 0];
        });
    };
    btns.forEach((b) => b.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const id = b.closest('.property-card').dataset.id;
        favs = favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id];
        try { localStorage.setItem(KEY, JSON.stringify(favs)); } catch (err) { /* sem storage */ }
        paint();
    }));
    document.addEventListener('click', (e) => { if (e.target.closest('#langMenu li, #langCycle')) setTimeout(paint, 80); });
    paint();
});

/* ===== Card clicável ===== */
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.property-card').forEach((card) => {
        const a = card.querySelector('a.btn-card[data-page]');
        if (!a) return;
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            if (e.target.closest('.fav-btn, a, button, [class*="dot"]')) return;
            a.click();
        });
    });
});
