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

document.querySelectorAll('.btn-outline').forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();


        // Puxando dados da section do HTML
        document.getElementById("modalTitle").innerText = button.getAttribute('data-title');
        document.getElementById("modalLocation").innerText = button.getAttribute('data-location');
        document.getElementById("modalImg").src = button.getAttribute('data-img');
        document.getElementById("modalBeds").innerText = button.getAttribute('data-beds');
        document.getElementById("modalBaths").innerText = button.getAttribute('data-baths');
        document.getElementById("modalDesc").innerText = button.getAttribute('data-desc');

        modal.style.display = "block";
    });
});

//Fechar modal
document.querySelector(".close").onclick = () => modal.style.display = "none";
document.querySelector(".close-modal").onclick = () => modal.style.display = "none";
window.onclick = (event) => {
    if (event.target == modal) {
        modal.style.display = "block";
    }
};

/* ---------- NAVBAR TOGGLE ---------- */
document.addEventListener('DOMContentLoaded', function() {
    const navToggle = document.querySelector('.nav-toggle');
    const navbar = document.querySelector('.navbar');
    const langCycle = document.getElementById('langCycle');
    const langMenuBtn = document.getElementById('langMenuBtn');
    const langMenu = document.getElementById('langMenu');

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
            'modal.about': 'Sobre o Imóvel',
            'modal.close': 'FECHAR',
            'how.title': 'Como <span>Funciona</span>',
            'how.subtitle': 'Processo simples e transparente para você encontrar seu imóvel',
            'why.title': 'Por que escolher a nossa imobiliaria',
            'why.desc': 'Somos uma empresa especializada em gestão de imóveis, dedicada a oferecer soluções completas para proprietários e inquilinos. Com uma equipe experiente e um portfólio diversificado, garantimos um serviço de alta qualidade, transparência e satisfação para nossos clientes. Nossa missão é facilitar o processo de compra, venda e locação de imóveis, proporcionando uma experiência tranquila e eficiente.',
            'why.cta': 'Entre em Contato',
            'contact.title': 'Vamos conversar sobre seu <span>próximo imóvel</span>',
            'contact.desc': 'Nossa equipe está pronta para atendê-lo e encontrar a melhor solução para suas necessidades.',
            'contact.call': 'Ligue para nós',
            'contact.hours': 'Seg - Sáb: 9h às 18h',
            'contact.whatsapp': 'WhatsApp',
            'contact.whatsappNote': 'Atendimento rápido',
            'contact.email': 'Envie um e-mail',
            'contact.visit': 'Visite nosso escritório',
            'contact.address': 'Jean Jaures, 863, Balvanera - CABA, AR',
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
            'footer.contactTitle': 'Contato',
            'footer.address': 'Av. Paulista, 1000<br>São Paulo - SP',
            'footer.phone': '(11) 1234-5678',
            'footer.email': 'contato@limaimobiliaria.com.br',
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
            'modal.about': 'Sobre la propiedad',
            'modal.close': 'CERRAR',
            'how.title': 'Cómo <span>Funciona</span>',
            'how.subtitle': 'Proceso simple y transparente para que encuentre su propiedad',
            'why.title': 'Por qué elegir nuestra inmobiliaria',
            'why.desc': 'Somos una empresa especializada en la gestión de inmuebles, dedicada a ofrecer soluciones completas para propietarios e inquilinos. Con un equipo experimentado y un portafolio diverso, garantizamos un servicio de alta calidad, transparencia y satisfacción para nuestros clientes. Nuestra misión es facilitar el proceso de compra, venta y alquiler de propiedades, proporcionando una experiencia tranquila y eficiente.',
            'why.cta': 'Contacte',
            'contact.title': 'Hablemos sobre su <span>próxima propiedad</span>',
            'contact.desc': 'Nuestro equipo está listo para atenderle y encontrar la mejor solución para sus necesidades.',
            'contact.call': 'Llámenos',
            'contact.hours': 'Lun - Sáb: 9h a 18h',
            'contact.whatsapp': 'WhatsApp',
            'contact.whatsappNote': 'Atención rápida',
            'contact.email': 'Envíe un correo',
            'contact.visit': 'Visite nuestra oficina',
            'contact.address': 'Jean Jaures, 863, Balvanera - CABA, AR',
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
            'footer.contactTitle': 'Contacto',
            'footer.address': 'Av. Paulista, 1000<br>São Paulo - SP',
            'footer.phone': '(11) 1234-5678',
            'footer.email': 'contato@limaimobiliaria.com.br',
            'footer.copyright': '&copy; 2026 Lima Inmobiliaria. Todos los derechos reservados.'
        }
    };
    // Additional translation keys for services, form and footer links
    // Portuguese (pt)
    translations.pt['service.management.title'] = 'Gestão de Imóveis';
    translations.pt['service.management.desc'] = 'Administração completa de propriedades.';
    translations.pt['service.rent.title'] = 'Locação';
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
    translations.pt['footer.service.rent'] = 'Locação';
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
    translations.es['form.submit'] = 'Enviar por WhatsApp';

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
                // If contains HTML (span), set innerHTML, else textContent
                if (dict[key].includes('<span') || el.tagName === 'A' && dict[key].includes('<span')) {
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

        // On resize, close or reposition as needed
        window.addEventListener('resize', () => {
            if (window.innerWidth > 1024) {
                navbar.classList.remove('open');
            }
        });
    }
});
