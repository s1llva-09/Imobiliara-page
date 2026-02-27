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
const modalContent = modal ? modal.querySelector('.modal-content') : null;
let closeModalTimer = null;
const MODAL_ANIMATION_MS = 240;
let modalScrollBlockBound = false;

const preventBackgroundScroll = (event) => {
    if (!modal || !modal.classList.contains('is-open')) return;
    if (modalContent && modalContent.contains(event.target)) return;
    event.preventDefault();
};

const bindModalScrollBlock = () => {
    if (modalScrollBlockBound) return;
    document.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
    document.addEventListener('wheel', preventBackgroundScroll, { passive: false });
    modalScrollBlockBound = true;
};

const unbindModalScrollBlock = () => {
    if (!modalScrollBlockBound) return;
    document.removeEventListener('touchmove', preventBackgroundScroll);
    document.removeEventListener('wheel', preventBackgroundScroll);
    modalScrollBlockBound = false;
};

const openPropertyModal = (button) => {
    if (!modal) return;

    // Puxando dados da section do HTML
    document.getElementById("modalTitle").innerText = button.getAttribute('data-title');
    document.getElementById("modalLocation").innerText = button.getAttribute('data-location');
    document.getElementById("modalImg").src = button.getAttribute('data-img');
    document.getElementById("modalBeds").innerText = button.getAttribute('data-beds');
    document.getElementById("modalBaths").innerText = button.getAttribute('data-baths');
    document.getElementById("modalDesc").innerText = button.getAttribute('data-desc');

    if (closeModalTimer) {
        clearTimeout(closeModalTimer);
        closeModalTimer = null;
    }

    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    bindModalScrollBlock();
    modal.classList.add('is-open');
};

const closePropertyModal = () => {
    if (!modal || !modal.classList.contains('is-open')) return;

    modal.classList.remove('is-open');
    closeModalTimer = window.setTimeout(() => {
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
        unbindModalScrollBlock();
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

    // Fechar clicando fora do conteúdo
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closePropertyModal();
        }
    });

    // Fechar com tecla Esc
    window.addEventListener('keydown', (event) => {
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
        document.documentElement.style.setProperty('--navbar-offset', `${navbarHeight + 8}px`);
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
            'footer.about': 'Sua parceira de confiança no mercado imobiliário há mais de 15 anos.',
            'footer.servicesTitle': 'Serviços',
            'footer.companyTitle': 'Empresa',
            'footer.company.about': 'Sobre nós',
            'footer.company.team': 'Equipe',
            'footer.company.careers': 'Carreiras',
            'footer.company.blog': 'Blog',
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
            'footer.about': 'Su socio de confianza en el mercado inmobiliario por más de 15 años.',
            'footer.servicesTitle': 'Servicios',
            'footer.companyTitle': 'Empresa',
            'footer.company.about': 'Sobre nosotros',
            'footer.company.team': 'Equipo',
            'footer.company.careers': 'Carreras',
            'footer.company.blog': 'Blog',
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
    translations.pt['service.rent.desc'] = 'Encontramos os melhores inquilinos.';
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

        // Update language cycle UI (flag + code)
        if (langCycle) {
            const flag = (lang === 'pt') ? '🇧🇷' : '🇦🇷';
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

