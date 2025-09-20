from django.core.management.base import BaseCommand
from authentication.models import Psicologo, Paciente
from core.models import CategoriaMensagem, SementeCuidado, MensagemPaciente
from django.utils import timezone
from datetime import timedelta

class Command(BaseCommand):
    help = 'Cria sementes do cuidado de exemplo'

    def handle(self, *args, **options):
        psicologos = Psicologo.objects.all()
        
        if not psicologos.exists():
            self.stdout.write(
                self.style.WARNING('Nenhum psicólogo encontrado. Cadastre um psicólogo primeiro.')
            )
            return
        
        # Categorias de exemplo
        categorias_exemplo = [
            {
                'nome': 'Motivação',
                'descricao': 'Mensagens para motivar e inspirar',
                'icone': 'star',
                'cor': '#FFB74D'
            },
            {
                'nome': 'Relaxamento',
                'descricao': 'Dicas para relaxar e desestressar',
                'icone': 'leaf',
                'cor': '#A5D6A7'
            },
            {
                'nome': 'Reflexão',
                'descricao': 'Pensamentos para reflexão pessoal',
                'icone': 'moon',
                'cor': '#BA68C8'
            },
            {
                'nome': 'Exercícios',
                'descricao': 'Atividades práticas de bem-estar',
                'icone': 'heart',
                'cor': '#FF8A65'
            },
            {
                'nome': 'Mindfulness',
                'descricao': 'Práticas de atenção plena',
                'icone': 'peace',
                'cor': '#64B5F6'
            }
        ]
        
        # Sementes de exemplo
        sementes_exemplo = [
            {
                'titulo': 'Respire Fundo',
                'conteudo': 'Quando se sentir ansioso, pare por um momento e respire profundamente. Inspire por 4 segundos, segure por 4 e expire por 6. Repita 3 vezes.',
                'tipo': 'respiracao',
                'categoria_nome': 'Relaxamento'
            },
            {
                'titulo': 'Você é Capaz',
                'conteudo': 'Lembre-se: você já superou 100% dos seus dias difíceis até agora. Isso é uma estatística impressionante! Você é mais forte do que imagina.',
                'tipo': 'motivacional',
                'categoria_nome': 'Motivação'
            },
            {
                'titulo': 'Momento de Gratidão',
                'conteudo': 'Antes de dormir hoje, pense em 3 coisas pelas quais você é grato. Podem ser pequenas ou grandes. A gratidão transforma nossa perspectiva.',
                'tipo': 'gratidao',
                'categoria_nome': 'Reflexão'
            },
            {
                'titulo': 'Exercício de Mindfulness',
                'conteudo': 'Escolha um objeto próximo a você. Observe-o por 2 minutos: sua cor, textura, forma. Isso é mindfulness - estar presente no momento.',
                'tipo': 'mindfulness',
                'categoria_nome': 'Mindfulness'
            },
            {
                'titulo': 'Caminhada Consciente',
                'conteudo': 'Que tal uma caminhada de 10 minutos? Sem fone, sem pressa. Apenas você, seus passos e o mundo ao seu redor. É terapêutico!',
                'tipo': 'exercicio',
                'categoria_nome': 'Exercícios'
            },
            {
                'titulo': 'Autocompaixão',
                'conteudo': 'Trate-se com a mesma gentileza que trataria um bom amigo. Você merece amor e compreensão, especialmente de si mesmo.',
                'tipo': 'autoestima',
                'categoria_nome': 'Motivação'
            }
        ]
        
        for psicologo in psicologos:
            # Criar categorias
            categorias_criadas = {}
            for cat_data in categorias_exemplo:
                categoria, created = CategoriaMensagem.objects.get_or_create(
                    psicologo=psicologo,
                    nome=cat_data['nome'],
                    defaults=cat_data
                )
                categorias_criadas[cat_data['nome']] = categoria
                if created:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Categoria "{categoria.nome}" criada para {psicologo.user.first_name}'
                        )
                    )
            
            # Criar sementes
            for semente_data in sementes_exemplo:
                categoria = categorias_criadas.get(semente_data.pop('categoria_nome'))
                semente, created = SementeCuidado.objects.get_or_create(
                    psicologo=psicologo,
                    titulo=semente_data['titulo'],
                    defaults={
                        **semente_data,
                        'categoria': categoria,
                        'status': 'ativa',
                        'publica': True
                    }
                )
                if created:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Semente "{semente.titulo}" criada para {psicologo.user.first_name}'
                        )
                    )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Processo concluído! Categorias e sementes criadas para {psicologos.count()} psicólogo(s).'
            )
        )