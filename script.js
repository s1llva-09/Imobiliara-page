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

const isMobileViewport = () => window.matchMedia('(max-width: 900px)').matches;

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
};

const changeModalImage = (step) => {
    if (modalGallery.length <= 1) return;
    modalGalleryIndex = (modalGalleryIndex + step + modalGallery.length) % modalGallery.length;
    renderModalImage();
};

const handleModalImageClick = () => {
    if (isMobileViewport() && modalGallery.length > 1) {
        changeModalImage(1);
        return;
    }
    openImageLightbox();
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
    if (modalImg) modalImg.onclick = handleModalImageClick;
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

    const syncNavbarOffset = () => {
        if (!navbar) return;
        const navbarHeight = Math.ceil(navbar.getBoundingClientRect().height);
        document.documentElement.style.setProperty('--navbar-offset', `${navbarHeight}px`);
    };

    syncNavbarOffset();
    window.addEventListener('resize', syncNavbarOffset);
    window.addEventListener('load', syncNavbarOffset);

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
            'footer.copyright': '&copy; 2026 Lima Imobiliária. Todos os direitos reservados.'
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
            'footer.copyright': '&copy; 2026 Lima Inmobiliaria. Todos los derechos reservados.'
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

    // Properties cards (PT/ES): visible labels + modal dynamic content
    translations.pt['properties.details'] = 'Ver detalhes';
    translations.es['properties.details'] = 'Ver detalles';
    translations.pt['modal.beds'] = 'Quartos';
    translations.pt['modal.baths'] = 'Banheiros';
    translations.es['modal.beds'] = 'Habitaciones';
    translations.es['modal.baths'] = 'Baños';

    translations.pt['properties.card1.title'] = 'Apartamento Moderno';
    translations.pt['properties.card1.modalTitle'] = 'Apartamento Moderno';
    translations.pt['properties.card1.location'] = 'Aguero 1100 (A) - Barrio Norte';
    translations.pt['properties.card1.desc'] = `✨ Oportunidade ideal para estudantes da UBA!
Localizado a poucos passos da Faculdade de Medicina, este apartamento mobiliado e perfeito para quem busca conforto, localizacao estrategica e ambientes amplos.
Capacidade para ate 3 pessoas.

Detalhes do apartamento:
🏙️ Sacada
🧺 Lavarropas
🚿 2 banheiros
🌞 Ambientes luminosos
🐾 Aceita pets

Condicoes:
Aluguel 980.000 + 250.000 de expensas
Luz, gas e Wi-Fi por conta do inquilino
Contrato de 6 meses, ideal para estudantes
Zona estrategica perto de todos os servicos, comercios e transporte`;

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

    translations.pt['properties.card3.title'] = 'Apartamento de 2 Ambientes';
    translations.pt['properties.card3.modalTitle'] = 'Apartamento de 2 Ambientes';
    translations.pt['properties.card3.location'] = 'Palestina 800 - Almagro';
    translations.pt['properties.card3.desc'] = `🏡✨ RESERVE JA! ✨🏡

📅 Disponivel 10/03

📍 Palestina 800 - Almagro
🛏️ 2 ambientes super confortaveis
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

    translations.es['properties.card1.title'] = 'Apartamento Moderno';
    translations.es['properties.card1.modalTitle'] = 'Apartamento Moderno';
    translations.es['properties.card1.location'] = 'Aguero 1100 (A) - Barrio Norte';
    translations.es['properties.card1.desc'] = `✨ ¡Oportunidad ideal para estudiantes de la UBA!
Ubicado a pasos de la Facultad de Medicina, este departamento amoblado es perfecto para quienes buscan comodidad, ubicación estratégica y espacios amplios.
Capacidad para hasta 3 personas.

Detalles del departamento:
🏙️ Balcón
🧺 Lavarropas
🚿 2 baños
🌞 Ambientes luminosos
🐾 Acepta mascotas

Condiciones:
Alquiler 980.000 + 250.000 expensas
Luz, gas y Wi-Fi a cargo del inquilino
Contrato de 6 meses, ideal para estudiantes
Zona estratégica cerca de todos los servicios, comercios y transporte`;

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

    translations.es['properties.card3.title'] = 'Departamento de 2 Ambientes';
    translations.es['properties.card3.modalTitle'] = 'Departamento de 2 Ambientes';
    translations.es['properties.card3.location'] = 'Palestina 800 - Almagro';
    translations.es['properties.card3.desc'] = `🏡✨ ¡RESERVE YA! ✨🏡

📅 Disponible 10/03

📍 Palestina 800 - Almagro
🛏️ 2 ambientes súper cómodos
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

    // additional small keys
    translations.pt['step.negotiation'] = 'Nossa equipe ajuda em toda a negociação e documentação.';
    translations.es['step.negotiation'] = 'Nuestro equipo ayuda en toda la negociación y documentación.';

    translations.pt['why.featureDesc'] = 'Atendimento personalizado e orientação especializada para garantir a melhor experiência imobiliária.';
    translations.es['why.featureDesc'] = 'Atención personalizada y orientación especializada para garantizar la mejor experiencia inmobiliaria.';
    // Satisfaction stat
    translations.pt['stat.satisfaction'] = 'Taxa de Satisfação';
    translations.es['stat.satisfaction'] = 'Tasa de Satisfacción';

    function applyTranslations(lang) {
        const dict = translations[lang] || translations.es;
        document.documentElement.lang = (lang === 'pt') ? 'pt-BR' : 'es';
        // Update text/HTML for items with data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (!key) return;
            if (dict[key]) {
                // Render HTML safely for trusted translation strings that include tags
                if (/<[^>]+>/.test(dict[key])) {
                    el.innerHTML = dict[key];
                } else {
                    el.textContent = dict[key];
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
        navToggle.addEventListener('click', function() {
            navbar.classList.toggle('open');
        });

        // Fechar menu ao clicar em um item
        document.querySelectorAll('.navbar nav ul li a').forEach(a => {
            a.addEventListener('click', () => {
                navbar.classList.remove('open');
            });
        });

        // Fechar menu quando clicar fora da navbar
        document.addEventListener('click', (event) => {
            if (window.innerWidth <= 900 && !navbar.contains(event.target)) {
                navbar.classList.remove('open');
            }
        });

        // On resize, close or reposition as needed
        window.addEventListener('resize', () => {
            if (window.innerWidth > 900) {
                navbar.classList.remove('open');
            }
        });
    }
});

