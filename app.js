// 🚀 APPLICATION PRINCIPALE - SUIVI COMMANDES ETSY

// État global
let commandes = [];
let boutiques = [];
let produits = [];
let pays = [];

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initFormulaire();
    chargerDonnees();
    
    // Vérifier si l'URL est configurée
    if (CONFIG.API_URL === 'https://script.google.com/macros/s/AKfycbz6cxI2D8kpYTRpujuR3jXUeX6vdX2QrQllX4Bh0LHR9xHUCY753FfZ8nmT64rGhbPj/exec') {
        console.warn('⚠️ URL Google Apps Script non configurée');
    } else {
        document.getElementById('configBanner').style.display = 'none';
    }
});

// === NAVIGATION ===
function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPage = btn.dataset.page;
            
            // Mettre à jour les boutons
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Mettre à jour les pages
            pages.forEach(page => page.classList.remove('active'));
            document.getElementById(`page-${targetPage}`).classList.add('active');
            
            // Charger les données spécifiques à la page
            if (targetPage === 'dashboard') {
                calculerStatistiques();
            } else if (targetPage === 'commandes') {
                afficherCommandes();
            } else if (targetPage === 'boutiques') {
                afficherBoutiques();
            } else if (targetPage === 'aide') {
                initAideAuChoix();
            }
        });
    });
}

// === FORMULAIRE ===
function initFormulaire() {
    const form = document.getElementById('formCommande');
    const prixAchat = document.getElementById('prixAchat');
    const prixVente = document.getElementById('prixVenteEtsy');
    const beneficePreview = document.getElementById('beneficePreview');
    
    // Mise à jour du bénéfice en temps réel
    const updateBenefice = () => {
        const achat = parseFloat(prixAchat.value) || 0;
        const vente = parseFloat(prixVente.value) || 0;
        const benefice = vente - achat;
        
        if (achat > 0 && vente > 0) {
            const rentabilite = ((benefice / achat) * 100).toFixed(1);
            beneficePreview.textContent = `${benefice.toFixed(2)} € (${rentabilite}%)`;
            beneficePreview.style.color = benefice > 0 ? 'var(--accent-success)' : 'var(--accent-error)';
        } else {
            beneficePreview.textContent = 'Calculé automatiquement';
            beneficePreview.style.color = 'var(--text-secondary)';
        }
    };
    
    prixAchat.addEventListener('input', updateBenefice);
    prixVente.addEventListener('input', updateBenefice);
    
    // Définir la date du jour par défaut
    document.getElementById('dateCommande').valueAsDate = new Date();
    
    // Soumission du formulaire
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await enregistrerCommande();
    });
}

// === ENREGISTRER COMMANDE ===
async function enregistrerCommande() {
    const btnSubmit = document.querySelector('.btn-primary');
    const btnText = btnSubmit.querySelector('.btn-text');
    const btnLoader = btnSubmit.querySelector('.btn-loader');
    const successAlert = document.getElementById('successAlert');
    const errorAlert = document.getElementById('errorAlert');
    
    // Masquer les alertes précédentes
    successAlert.style.display = 'none';
    errorAlert.style.display = 'none';
    
    // Afficher le loader
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';
    btnSubmit.disabled = true;
    
    try {
        // Récupérer les données du formulaire
        const formData = {
            numeroCommande: document.getElementById('numeroCommande').value,
            dateCommande: document.getElementById('dateCommande').value,
            nomProduit: document.getElementById('nomProduit').value,
            categorie: document.getElementById('categorie').value,
            statut: document.getElementById('statut').value,
            notes: document.getElementById('notes').value,
            nomClient: document.getElementById('nomClient').value,
            adresseClient: document.getElementById('adresseClient').value,
            paysClient: document.getElementById('paysClient').value,
            boutiqueAliExpress: document.getElementById('boutiqueAliExpress').value,
            lienAliExpress: document.getElementById('lienAliExpress').value,
            prixAchat: parseFloat(document.getElementById('prixAchat').value) || 0,
            dateAchatAliExpress: document.getElementById('dateAchatAliExpress').value,
            dateLivraisonEstimee: document.getElementById('dateLivraisonEstimee').value,
            dateLivraisonReelle: document.getElementById('dateLivraisonReelle').value,
            prixVenteEtsy: parseFloat(document.getElementById('prixVenteEtsy').value) || 0
        };
        
        // Envoyer à Google Apps Script
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        // Note : avec no-cors, on ne peut pas lire la réponse
        // On suppose que ça a fonctionné
        successAlert.style.display = 'block';
        document.getElementById('formCommande').reset();
        document.getElementById('dateCommande').valueAsDate = new Date();
        
        // Recharger les données
        setTimeout(() => {
            chargerDonnees();
            successAlert.style.display = 'none';
        }, 3000);
        
    } catch (error) {
        console.error('Erreur:', error);
        errorAlert.style.display = 'block';
        errorAlert.textContent = `✕ Erreur : ${error.message}`;
    } finally {
        // Restaurer le bouton
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        btnSubmit.disabled = false;
    }
}

// === CHARGER DONNÉES ===
async function chargerDonnees() {
    try {
        const response = await fetch(CONFIG.API_URL);
        const result = await response.json();
        
        if (result.status === 'success') {
            commandes = result.data || [];
            analyserDonnees();
            calculerStatistiques();
        }
    } catch (error) {
        console.error('Erreur chargement:', error);
        // Utiliser des données de démo si erreur
        commandes = [];
    }
}

// === ANALYSER DONNÉES ===
function analyserDonnees() {
    // Extraire les boutiques uniques
    const boutiquesMap = new Map();
    const produitsSet = new Set();
    const paysSet = new Set();
    
    commandes.forEach(cmd => {
        // Boutiques
        const nomBoutique = cmd['Boutique AliExpress'];
        if (nomBoutique) {
            if (!boutiquesMap.has(nomBoutique)) {
                boutiquesMap.set(nomBoutique, {
                    nom: nomBoutique,
                    commandes: [],
                    livrees: 0,
                    retards: 0,
                    problemes: 0,
                    delais: [],
                    pays: new Set()
                });
            }
            
            const boutique = boutiquesMap.get(nomBoutique);
            boutique.commandes.push(cmd);
            
            const statut = cmd['Statut'];
            if (statut === 'livré') boutique.livrees++;
            if (statut === 'retard') boutique.retards++;
            if (statut === 'problème') boutique.problemes++;
            
            const delai = cmd['Délai réel'];
            if (delai && typeof delai === 'number') {
                boutique.delais.push(delai);
            }
            
            const pays = cmd['Pays client'];
            if (pays) boutique.pays.add(pays);
        }
        
        // Produits
        const produit = cmd['Nom produit'];
        if (produit) produitsSet.add(produit);
        
        // Pays
        const pays = cmd['Pays client'];
        if (pays) paysSet.add(pays);
    });
    
    // Calculer fiabilité des boutiques
    boutiques = Array.from(boutiquesMap.values()).map(b => {
        const total = b.commandes.length;
        const tauxLivraison = total > 0 ? (b.livrees / total) * 100 : 0;
        const tauxProblemes = total > 0 ? ((b.retards + b.problemes) / total) * 100 : 0;
        const delaiMoyen = b.delais.length > 0 
            ? b.delais.reduce((a, b) => a + b, 0) / b.delais.length 
            : 0;
        
        // Déterminer fiabilité
        let fiabilite = 'Moyen';
        if (tauxLivraison >= 80 && tauxProblemes <= 10 && delaiMoyen <= 20) {
            fiabilite = 'Fiable';
        } else if (tauxProblemes > 30 || delaiMoyen > 40) {
            fiabilite = 'À éviter';
        }
        
        return {
            ...b,
            total,
            tauxLivraison,
            tauxProblemes,
            delaiMoyen,
            fiabilite,
            paysArray: Array.from(b.pays)
        };
    });
    
    produits = Array.from(produitsSet).sort();
    pays = Array.from(paysSet).sort();
}

// === STATISTIQUES ===
function calculerStatistiques() {
    const totalCommandes = commandes.length;
    const chiffreAffaires = commandes.reduce((sum, cmd) => {
        const prix = parseFloat(cmd['Prix vente Etsy']) || 0;
        return sum + prix;
    }, 0);
    
    const beneficeTotal = commandes.reduce((sum, cmd) => {
        const benefice = parseFloat(cmd['Bénéfice']) || 0;
        return sum + benefice;
    }, 0);
    
    const rentabiliteMoyenne = chiffreAffaires > 0 
        ? (beneficeTotal / (chiffreAffaires - beneficeTotal)) * 100 
        : 0;
    
    // Mettre à jour l'affichage
    document.getElementById('stat-total').textContent = totalCommandes;
    document.getElementById('stat-ca').textContent = `${chiffreAffaires.toFixed(2)} €`;
    document.getElementById('stat-benefice').textContent = `${beneficeTotal.toFixed(2)} €`;
    document.getElementById('stat-rentabilite').textContent = `${rentabiliteMoyenne.toFixed(1)}%`;
    
    // Top produits
    const produitsStats = {};
    commandes.forEach(cmd => {
        const produit = cmd['Nom produit'];
        if (produit) {
            if (!produitsStats[produit]) {
                produitsStats[produit] = { count: 0, benefice: 0 };
            }
            produitsStats[produit].count++;
            produitsStats[produit].benefice += parseFloat(cmd['Bénéfice']) || 0;
        }
    });
    
    const topProduits = Object.entries(produitsStats)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5);
    
    const topProduitsHTML = topProduits.length > 0
        ? topProduits.map(([nom, stats]) => `
            <div class="detail-item">
                <span class="detail-item-name">${nom}</span>
                <span class="detail-item-value">${stats.count} ventes</span>
            </div>
        `).join('')
        : '<div class="empty-state">Aucune donnée</div>';
    
    document.getElementById('top-produits').innerHTML = topProduitsHTML;
    
    // Top pays
    const paysStats = {};
    commandes.forEach(cmd => {
        const pays = cmd['Pays client'];
        if (pays) {
            paysStats[pays] = (paysStats[pays] || 0) + 1;
        }
    });
    
    const topPays = Object.entries(paysStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const topPaysHTML = topPays.length > 0
        ? topPays.map(([nom, count]) => `
            <div class="detail-item">
                <span class="detail-item-name">${nom}</span>
                <span class="detail-item-value">${count} commandes</span>
            </div>
        `).join('')
        : '<div class="empty-state">Aucune donnée</div>';
    
    document.getElementById('top-pays').innerHTML = topPaysHTML;
    
    // Top boutiques
    const topBoutiques = boutiques
        .filter(b => b.fiabilite === 'Fiable')
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    
    const topBoutiquesHTML = topBoutiques.length > 0
        ? topBoutiques.map(b => `
            <div class="detail-item">
                <span class="detail-item-name">${b.nom}</span>
                <span class="detail-item-value">${b.total} commandes</span>
            </div>
        `).join('')
        : '<div class="empty-state">Aucune boutique fiable</div>';
    
    document.getElementById('top-boutiques').innerHTML = topBoutiquesHTML;
}

// === AFFICHER COMMANDES ===
function afficherCommandes() {
    const tbody = document.getElementById('commandesTableBody');
    
    if (commandes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Aucune commande enregistrée</td></tr>';
        return;
    }
    
    const html = commandes.map(cmd => {
        const statut = cmd['Statut'] || 'en cours';
        const statutClass = statut.toLowerCase().replace(' ', '-');
        const benefice = parseFloat(cmd['Bénéfice']) || 0;
        const beneficeColor = benefice >= 0 ? 'var(--accent-success)' : 'var(--accent-error)';
        
        return `
            <tr>
                <td><code>${cmd['Numéro commande']}</code></td>
                <td>${formatDate(cmd['Date commande'])}</td>
                <td>${cmd['Nom produit']}</td>
                <td>${cmd['Nom client']}</td>
                <td>${cmd['Pays client']}</td>
                <td><span class="badge badge-${statutClass}">${statut}</span></td>
                <td>${cmd['Boutique AliExpress']}</td>
                <td>${formatPrice(cmd['Prix vente Etsy'])}</td>
                <td style="color: ${beneficeColor}; font-weight: 600;">${formatPrice(benefice)}</td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = html;
}

// === AFFICHER BOUTIQUES ===
function afficherBoutiques() {
    const container = document.getElementById('boutiquesContainer');
    
    if (boutiques.length === 0) {
        container.innerHTML = '<div class="empty-state">Aucune boutique enregistrée</div>';
        return;
    }
    
    const html = boutiques.map(b => {
        const fiabiliteClass = b.fiabilite.toLowerCase().replace(' ', '-').replace('à-', '');
        
        return `
            <div class="boutique-card">
                <div class="boutique-header">
                    <h3 class="boutique-name">${b.nom}</h3>
                    <span class="fiabilite-badge fiabilite-${fiabiliteClass}">${b.fiabilite}</span>
                </div>
                <div class="boutique-stats">
                    <div class="boutique-stat">
                        <span class="boutique-stat-label">Commandes totales</span>
                        <span class="boutique-stat-value">${b.total}</span>
                    </div>
                    <div class="boutique-stat">
                        <span class="boutique-stat-label">Livrées</span>
                        <span class="boutique-stat-value">${b.livrees}</span>
                    </div>
                    <div class="boutique-stat">
                        <span class="boutique-stat-label">Retards</span>
                        <span class="boutique-stat-value">${b.retards}</span>
                    </div>
                    <div class="boutique-stat">
                        <span class="boutique-stat-label">Problèmes</span>
                        <span class="boutique-stat-value">${b.problemes}</span>
                    </div>
                    <div class="boutique-stat">
                        <span class="boutique-stat-label">Délai moyen</span>
                        <span class="boutique-stat-value">${b.delaiMoyen.toFixed(0)} jours</span>
                    </div>
                    <div class="boutique-stat">
                        <span class="boutique-stat-label">Pays desservis</span>
                        <span class="boutique-stat-value">${b.paysArray.join(', ')}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// === AIDE AU CHOIX ===
function initAideAuChoix() {
    const selectProduit = document.getElementById('selectProduit');
    const selectPays = document.getElementById('selectPays');
    
    // Remplir les sélecteurs
    selectProduit.innerHTML = '<option value="">-- Choisir --</option>' + 
        produits.map(p => `<option value="${p}">${p}</option>`).join('');
    
    selectPays.innerHTML = '<option value="">-- Choisir --</option>' + 
        pays.map(p => `<option value="${p}">${p}</option>`).join('');
    
    // Écouter les changements
    selectProduit.addEventListener('change', rechercherFournisseurs);
    selectPays.addEventListener('change', rechercherFournisseurs);
}

function rechercherFournisseurs() {
    const produitSelectionne = document.getElementById('selectProduit').value;
    const paysSelectionne = document.getElementById('selectPays').value;
    const resultsContainer = document.getElementById('aideResultats');
    
    if (!produitSelectionne || !paysSelectionne) {
        resultsContainer.innerHTML = '<div class="empty-state">Sélectionnez un produit et un pays</div>';
        return;
    }
    
    // Filtrer les commandes
    const commandesFiltrees = commandes.filter(cmd => 
        cmd['Nom produit'] === produitSelectionne && 
        cmd['Pays client'] === paysSelectionne
    );
    
    if (commandesFiltrees.length === 0) {
        resultsContainer.innerHTML = `
            <div class="empty-state">
                Aucune commande trouvée pour ce produit vers ce pays.<br>
                Essayez un autre fournisseur ou référez-vous à vos boutiques fiables.
            </div>
        `;
        return;
    }
    
    // Grouper par boutique
    const boutiquesStats = {};
    commandesFiltrees.forEach(cmd => {
        const boutique = cmd['Boutique AliExpress'];
        if (!boutiquesStats[boutique]) {
            boutiquesStats[boutique] = {
                nom: boutique,
                commandes: 0,
                livrees: 0,
                retards: 0,
                problemes: 0,
                delais: []
            };
        }
        
        boutiquesStats[boutique].commandes++;
        if (cmd['Statut'] === 'livré') boutiquesStats[boutique].livrees++;
        if (cmd['Statut'] === 'retard') boutiquesStats[boutique].retards++;
        if (cmd['Statut'] === 'problème') boutiquesStats[boutique].problemes++;
        
        const delai = cmd['Délai réel'];
        if (delai && typeof delai === 'number') {
            boutiquesStats[boutique].delais.push(delai);
        }
    });
    
    // Afficher les résultats
    const html = Object.values(boutiquesStats)
        .sort((a, b) => b.livrees - a.livrees)
        .map(b => {
            const delaiMoyen = b.delais.length > 0 
                ? (b.delais.reduce((a, c) => a + c, 0) / b.delais.length).toFixed(0)
                : 'N/A';
            
            const tauxReussite = b.commandes > 0 
                ? ((b.livrees / b.commandes) * 100).toFixed(0)
                : 0;
            
            let fiabilite = 'Moyen';
            if (tauxReussite >= 80 && b.problemes === 0) fiabilite = 'Fiable';
            else if (b.problemes > 0 || tauxReussite < 50) fiabilite = 'À éviter';
            
            const fiabiliteClass = fiabilite.toLowerCase().replace(' ', '-').replace('à-', '');
            
            return `
                <div class="boutique-card">
                    <div class="boutique-header">
                        <h3 class="boutique-name">${b.nom}</h3>
                        <span class="fiabilite-badge fiabilite-${fiabiliteClass}">${fiabilite}</span>
                    </div>
                    <div class="boutique-stats">
                        <div class="boutique-stat">
                            <span class="boutique-stat-label">Commandes</span>
                            <span class="boutique-stat-value">${b.commandes}</span>
                        </div>
                        <div class="boutique-stat">
                            <span class="boutique-stat-label">Taux de réussite</span>
                            <span class="boutique-stat-value">${tauxReussite}%</span>
                        </div>
                        <div class="boutique-stat">
                            <span class="boutique-stat-label">Délai moyen</span>
                            <span class="boutique-stat-value">${delaiMoyen} jours</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    
    resultsContainer.innerHTML = html;
}

// === UTILITAIRES ===
function formatDate(date) {
    if (!date) return 'N/A';
    if (date instanceof Date) {
        return date.toLocaleDateString('fr-FR');
    }
    const d = new Date(date);
    return isNaN(d.getTime()) ? date : d.toLocaleDateString('fr-FR');
}

function formatPrice(price) {
    if (!price && price !== 0) return 'N/A';
    const p = parseFloat(price);
    return isNaN(p) ? 'N/A' : `${p.toFixed(2)} €`;
}
