document.getElementById('whatsappForm').addEventListener('submit', function(e) {
    e.preventDefault(); // Impede a página de recarregar

    // Configurações
    const seuNumero = "5491127858950"; // COLOQUE SEU NÚMERO AQUI (com DDD e sem espaços)
    
    // Pega os valores dos campos
    const nome = document.getElementById('nome').value;
    const telefone = document.getElementById('telefone').value;
    const email = document.getElementById('email').value;
    const mensagem = document.getElementById('mensagem').value;

    // Monta o texto da mensagem
    const texto = `Olá, meu nome é *${nome}*.\n` +
                  `Meu telefone: ${telefone}\n` +
                  `Meu e-mail: ${email}\n\n` +
                  `*Mensagem:* ${mensagem}`;

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