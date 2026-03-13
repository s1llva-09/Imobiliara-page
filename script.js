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

const looksMojibake = (value) => /Ã.|Â.|ðŸ|â.|�/.test(value);

const fixMojibakeText = (value) => {
    if (typeof value !== 'string' || !looksMojibake(value)) return value;

    try {
        const bytes = Uint8Array.from(Array.from(value, (char) => char.charCodeAt(0) & 0xff));
        const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        return looksMojibake(decoded) ? value : decoded;
    } catch (error) {
        return value;
    }
};

const parseCount = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
};

const getCurrentSiteLang = () => {
    const htmlLang = (document.documentElement.lang || '').toLowerCase();
    return htmlLang.startsWith('pt') ? 'pt' : 'es';
};

const updateModalFeatureLabels = (bedsCount, bathsCount, lang = getCurrentSiteLang()) => {
    if (modalBedsLabel) {
        modalBedsLabel.textContent = lang === 'pt'
            ? (bedsCount === 1 ? 'Quarto' : 'Quartos')
            : (bedsCount === 1 ? 'Habitación' : 'Habitaciones');
    }

    if (modalBathsLabel) {
        modalBathsLabel.textContent = lang === 'pt'
            ? (bathsCount === 1 ? 'Banheiro' : 'Banheiros')
            : (bathsCount === 1 ? 'Baño' : 'Baños');
    }
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
            'form.phonePlaceholder': '(11) 99999-9999',
            'form.emailLabel': 'E-mail',
            'form.emailPlaceholder': 'seu@email.com',
            'form.msgLabel': 'Mensagem',
            'form.msgPlaceholder': 'Olá, gostaria de saber mais sobre...',
            'why.cta': 'Entre em Contato',
            'footer.about': 'Desde 2022 confiando em nós 🧡<br><br>Ela chegou do Brasil 🇧🇷 buscando segurança e acompanhamento... e há mais de 3 anos continua alugando com a Lima Imobiliária 🙌<br><br>Para nós, não se trata apenas de alugar um apartamento.<br>Trata-se de construir relações de longo prazo, com transparência e apoio constante.<br><br>Obrigado por continuar nos escolhendo.',
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
            'form.phonePlaceholder': '(11) 99999-9999',
            'form.emailLabel': 'Correo',
            'form.emailPlaceholder': 'su@email.com',
            'form.msgLabel': 'Mensaje',
            'form.msgPlaceholder': 'Hola, quisiera saber más sobre...',
            'footer.about': 'Desde 2022 confiando en nosotros 🧡<br><br>Ella llegó desde Brasil 🇧🇷 buscando seguridad y acompañamiento... y hace más de 3 años que sigue alquilando con Lima Inmobiliaria 🙌<br><br>Para nosotros, no se trata solo de alquilar un departamento.<br>Se trata de construir relaciones a largo plazo, con transparencia y apoyo constante.<br><br>Gracias por seguir eligiéndonos.',
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

    translations.pt['properties.card2.title'] = 'Apartamento de 5 Ambientes';
    translations.pt['properties.card2.modalTitle'] = 'Apartamento de 5 Ambientes';
    translations.pt['properties.card2.location'] = 'Thames 2300 (A) - Palermo';
    translations.pt['properties.card2.desc'] = `✨ Apartamento de 5 ambientes em Palermo – Disponivel ✨
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

    translations.pt['properties.card3.title'] = 'Apartamento de 3 Ambientes';
    translations.pt['properties.card3.modalTitle'] = 'Apartamento de 3 Ambientes';
    translations.pt['properties.card3.location'] = 'Palestina 800 - Almagro';
    translations.pt['properties.card3.desc'] = `🏡✨ RESERVE JA! ✨🏡

📅 Disponivel 10/03

📍 Palestina 800 - Almagro
🛏️ 3 ambientes super confortaveis
📆 Contrato semestral (bem flexivel!)
📐 Piso 7 com sacada grande, ideal para seus momentos de relaxamento

💰 Aluguel: $800.000
🧾 Expensas: $50.000
⚡ Servicos: luz, gas e WiFi a parte
🐶 Pet friendly 🐾

💛 No coracao de Almagro, a poucos passos da Av. Corrientes, subte, universidades e cafes.
Um bairro com vida cultural e tudo o que voce precisa para viver com conforto.`;

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

    translations.es['properties.card2.title'] = 'Departamento de 5 Ambientes';
    translations.es['properties.card2.modalTitle'] = 'Departamento de 5 Ambientes';
    translations.es['properties.card2.location'] = 'Thames 2300 (A) - Palermo';
    translations.es['properties.card2.desc'] = `✨ Departamento de 5 ambientes en Palermo – Disponible ✨
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

    translations.es['properties.card3.title'] = 'Departamento de 3 Ambientes';
    translations.es['properties.card3.modalTitle'] = 'Departamento de 3 Ambientes';
    translations.es['properties.card3.location'] = 'Palestina 800 - Almagro';
    translations.es['properties.card3.desc'] = `🏡✨ ¡RESERVE YA! ✨🏡

📅 Disponible 10/03

📍 Palestina 800 - Almagro
🛏️ 3 ambientes súper cómodos
📆 Contrato semestral (¡re flexible!)
📐 Piso 7 con balcón grande, ideal para tus momentos de relax

💰 Alquiler: $800.000
🧾 Expensas: $50.000
⚡ Servicios: luz, gas y WiFi aparte
🐶 Pet friendly 🐾

💛 En el corazón de Almagro, a pasos de Av. Corrientes, subte, universidades y cafés.
Un barrio con onda, vida cultural y todo lo que necesitás para vivir cómodo/a.`;

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

    function applyTranslations(lang) {
        const dict = translations[lang] || translations.es;
        document.documentElement.lang = (lang === 'pt') ? 'pt-BR' : 'es';
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
            const flag = (lang === 'pt') ? 'BR' : 'AR';
            const code = (lang === 'pt') ? 'PT' : 'ES';
            const flagEl = langCycle.querySelector('.lang-flag');
            const codeEl = langCycle.querySelector('.lang-code');
            if (flagEl) flagEl.textContent = flag;
            if (codeEl) codeEl.textContent = code;
            if (langMenuBtn) langMenuBtn.setAttribute('aria-expanded', 'false');
        }
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
            const next = current === 'es' ? 'pt' : 'es';
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

