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
    document.querySelectorAll('.btn-outline').forEach(button => {
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

    Object.assign(translations.es, {"properties.pal800.title": "Departamento 2 Ambientes en Almagro", "properties.pal800.modalTitle": "2 Ambientes en Almagro – Piso 9 con Balcón", "properties.pal800.location": "Palestina 800, 9° piso - Almagro", "properties.pal800.desc": "2 AMBIENTES EN ALMAGRO\n\n📍 Palestina 800, 9° piso – Almagro, Ciudad de Buenos Aires\n\nDepartamento de 2 ambientes ubicado en una excelente zona de Almagro, en un piso alto y con balcón, ofreciendo un espacio cómodo y funcional para quienes buscan vivir en Buenos Aires.\n\nLa propiedad se encuentra en una ubicación estratégica, próxima a Avenida Corrientes, estaciones de subte, universidades, comercios, cafés y diversos servicios, permitiendo acceder fácilmente a distintos puntos de la ciudad.\n\nCaracterísticas del departamento\n- 2 ambientes\n- Piso 9\n- Balcón\n- Contrato semestral\n- Se aceptan mascotas\n- Excelente ubicación\n\nValor y gastos\nAlquiler mensual: $980.000\nServicios a cargo del inquilino: luz y WiFi\n\nUbicación\nSobre Palestina al 800, en Almagro, en una zona residencial con excelente conectividad y una amplia oferta de comercios, gastronomía, universidades y transporte público.\n\nConsultá disponibilidad y condiciones de alquiler con LIMA INMOBILIARIA.", "properties.pal800.price": "$980.000"});
    Object.assign(translations.pt, {"properties.pal800.title": "Apartamento 2 Ambientes em Almagro", "properties.pal800.modalTitle": "2 Ambientes em Almagro – 9º andar com Sacada", "properties.pal800.location": "Palestina 800, 9° piso - Almagro", "properties.pal800.desc": "2 AMBIENTES EM ALMAGRO\n\n📍 Palestina 800, 9º andar – Almagro, Cidade de Buenos Aires\n\nApartamento de 2 ambientes localizado em uma excelente região de Almagro, em andar alto e com sacada, oferecendo um espaço confortável e funcional para quem busca morar em Buenos Aires.\n\nO imóvel tem localização estratégica, perto da Avenida Corrientes, estações de metrô, universidades, comércios, cafés e diversos serviços, o que facilita o acesso a vários pontos da cidade.\n\nCaracterísticas do apartamento\n- 2 ambientes\n- 9º andar\n- Sacada\n- Contrato semestral\n- Aceita animais de estimação\n- Excelente localização\n\nValor e despesas\nAluguel mensal: ARS 980.000\nPor conta do inquilino: luz e WiFi\n\nLocalização\nNa Palestina 800, em Almagro, em uma zona residencial com excelente conectividade e ampla oferta de comércios, gastronomia, universidades e transporte público.\n\nConsulte disponibilidade e condições de aluguel com a LIMA INMOBILIARIA.", "properties.pal800.price": "ARS 980.000"});
    Object.assign(translations.en, {"properties.pal800.title": "2-Room Apartment in Almagro", "properties.pal800.modalTitle": "2-Room Apartment in Almagro – 9th Floor with Balcony", "properties.pal800.location": "Palestina 800, 9° piso - Almagro", "properties.pal800.desc": "2 ROOMS IN ALMAGRO\n\n📍 Palestina 800, 9th floor – Almagro, Buenos Aires City\n\n2-room apartment in an excellent area of Almagro, on a high floor with a balcony, offering a comfortable, functional space for those who want to live in Buenos Aires.\n\nThe property has a strategic location, close to Avenida Corrientes, subway stations, universities, shops, cafés and a wide range of services, making it easy to get around the city.\n\nApartment features\n- 2 rooms\n- 9th floor\n- Balcony\n- 6-month contract\n- Pets accepted\n- Excellent location\n\nRent and expenses\nMonthly rent: ARS 980,000\nTenant pays: electricity and WiFi\n\nLocation\nOn Palestina 800, in Almagro, in a residential area with excellent connectivity and a wide choice of shops, restaurants, universities and public transport.\n\nAsk about availability and rental conditions with LIMA INMOBILIARIA.", "properties.pal800.price": "ARS 980,000"});

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



/* ===== Filtros: operación + tipo ===== */
document.addEventListener('DOMContentLoaded', () => {
    const panel = document.querySelector('.filter-panel');
    if (!panel) return;
    const cards = [...document.querySelectorAll('.properties-grid .property-card')];
    const count = document.getElementById('filterCount');
    const empty = document.getElementById('filterEmpty');
    const L = {
        es: { show: 'Mostrando', one: 'inmueble', many: 'inmuebles', none: 'No hay inmuebles con estos filtros por ahora.', cta: 'Consultanos por WhatsApp' },
        pt: { show: 'Mostrando', one: 'imóvel', many: 'imóveis', none: 'Não há imóveis com estes filtros no momento.', cta: 'Consulte-nos pelo WhatsApp' }
    };
    L.es.soon = 'Estamos actualizando nuestros inmuebles disponibles. Consultanos por WhatsApp y te contamos qué hay.';
    L.pt.soon = 'Estamos atualizando nossos imóveis disponíveis. Consulte-nos pelo WhatsApp e contamos o que há.';
    L.en = { soon: 'We are updating our available properties. Message us on WhatsApp and we will tell you what is available.', show: 'Showing', one: 'property', many: 'properties', none: 'No properties match these filters right now.', cta: 'Message us on WhatsApp' };
    const state = { op: 'all', type: 'all' };
    const matches = (c) => (state.op === 'all' || c.dataset.op === state.op) && (state.type === 'all' || c.dataset.type === state.type);
    const apply = () => {
        let n = 0;
        cards.forEach((c) => { const ok = matches(c); c.hidden = !ok; if (ok) n++; });
        const t = L[getCurrentSiteLang()] || L.es;
        count.textContent = n ? `${t.show} ${n} ${n === 1 ? t.one : t.many}` : '';
        const noFilter = state.op === 'all' && state.type === 'all';
        empty.hidden = n !== 0;
        empty.innerHTML = `<p>${noFilter ? t.soon : t.none}</p><a href="https://wa.me/5491127858950" target="_blank" rel="noopener noreferrer">${t.cta}</a>`;
    };
    panel.addEventListener('click', (e) => {
        const b = e.target.closest('.filter-chip');
        if (!b) return;
        state[b.dataset.group] = b.dataset.filter;
        panel.querySelectorAll(`.filter-chip[data-group="${b.dataset.group}"]`).forEach((x) => {
            x.classList.toggle('active', x === b);
            x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
        apply();
        const g = document.getElementById('imoveis');
        if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    document.addEventListener('click', (e) => {
        if (e.target.closest('#langMenu li, #langCycle')) setTimeout(apply, 80);
    });
    apply();
});
