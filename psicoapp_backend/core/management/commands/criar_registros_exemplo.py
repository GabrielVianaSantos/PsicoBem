from django.core.management.base import BaseCommand
from authentication.models import Paciente
from core.models import CategoriaOdisseia, RegistroOdisseia, MetaOdisseia
from django.utils import timezone
from datetime import date, time, timedelta
import random

class Command(BaseCommand):
    help = 'Cria registros de odisseia de exemplo'

    def handle(self, *args, **options):
        # Criar categorias padrão
        categorias_exemplo = [
            {
                'nome': 'Ansiedade',
                'descricao': 'Momentos de ansiedade e preocupação',
                'icone': 'anxious',
                'cor': '#FFEAA7'
            },
            {
                'nome': 'Alegria',
                'descricao': 'Momentos de felicidade e conquistas',
                'icone': 'happy',
                'cor': '#FFD700'
            },
            {
                'nome': 'Tristeza',
                'descricao': 'Momentos de melancolia e reflexão',
                'icone': 'sad',
                'cor': '#45B7D1'
            },
            {
                'nome': 'Gratidão',
                'descricao': 'Momentos de reconhecimento e agradecimento',
                'icone': 'grateful',
                'cor': '#FFA07A'
            },
            {
                'nome': 'Reflexão',
                'descricao': 'Momentos de autoconhecimento',
                'icone': 'calm',
                'cor': '#DDA0DD'
            }
        ]
        
        # Criar categorias
        for cat_data in categorias_exemplo:
            categoria, created = CategoriaOdisseia.objects.get_or_create(
                nome=cat_data['nome'],
                defaults=cat_data
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Categoria "{categoria.nome}" criada')
                )
        
        # Buscar pacientes
        pacientes = Paciente.objects.all()
        
        if not pacientes.exists():
            self.stdout.write(
                self.style.WARNING('Nenhum paciente encontrado. Cadastre um paciente primeiro.')
            )
            return
        
        # ✅ CORRIGIDO: Registros de exemplo com categoria_nome correta
        registros_exemplo = [
            {
                'situacao': 'Apresentação no trabalho',
                'pensamentos': 'Estava muito nervoso, pensando que todos iriam me julgar se eu errasse algo.',
                'humor_geral': 'triste',
                'intensidade_emocao': 4,
                'nivel_ansiedade': 7,
                'nivel_estresse': 8,
                'nivel_energia': 3,
                'categoria_nome': 'Ansiedade',  # ✅ CORRIGIDO: Chave existe
                'reacoes_fisicas': 'Coração acelerado, mãos suando, voz tremula',
                'comportamento': 'Evitei o contato visual, falei muito rápido',
                'estrategias_enfrentamento': 'Respirei fundo algumas vezes antes de começar'
            },
            {
                'situacao': 'Encontro com amigos no parque',
                'pensamentos': 'Que bom estar com pessoas que me fazem bem. Me sinto acolhido e compreendido.',
                'humor_geral': 'muito_feliz',
                'intensidade_emocao': 5,
                'nivel_ansiedade': 1,
                'nivel_estresse': 2,
                'nivel_energia': 9,
                'categoria_nome': 'Alegria',  # ✅ CORRIGIDO: Chave existe
                'reacoes_fisicas': 'Sensação de leveza, sorriso espontâneo',
                'comportamento': 'Falei bastante, ri muito, participei de todas as atividades',
                'estrategias_enfrentamento': 'Aproveitei o momento, estive presente'
            },
            {
                'situacao': 'Lendo um livro em casa',
                'pensamentos': 'Refletindo sobre minhas escolhas e como posso melhorar como pessoa.',
                'humor_geral': 'neutro',
                'intensidade_emocao': 3,
                'nivel_ansiedade': 3,
                'nivel_estresse': 2,
                'nivel_energia': 6,
                'categoria_nome': 'Reflexão',  # ✅ CORRIGIDO: Chave existe
                'reacoes_fisicas': 'Relaxado, respiração calma',
                'comportamento': 'Concentrado na leitura, fiz algumas anotações',
                'aprendizados': 'Percebi que tenho crescido muito nos últimos meses'
            }
        ]
        
        # Criar registros para cada paciente
        for paciente in pacientes:
            for i, registro_data in enumerate(registros_exemplo):
                # Definir data e hora
                data_reg = date.today() - timedelta(days=i + 1)
                hora_reg = time(
                    hour=random.randint(8, 20),
                    minute=random.randint(0, 59)
                )
                
                # ✅ CORRIGIDO: Fazer uma cópia do dicionário para não modificar o original
                registro_data_copy = registro_data.copy()
                categoria_nome = registro_data_copy.pop('categoria_nome')
                
                # Buscar categoria
                categoria = CategoriaOdisseia.objects.filter(
                    nome=categoria_nome
                ).first()
                
                # Verificar se já existe
                if not RegistroOdisseia.objects.filter(
                    paciente=paciente,
                    data_registro=data_reg,
                    hora_registro=hora_reg
                ).exists():
                    
                    registro = RegistroOdisseia.objects.create(
                        paciente=paciente,
                        categoria=categoria,
                        data_registro=data_reg,
                        hora_registro=hora_reg,
                        **registro_data_copy  # ✅ CORRIGIDO: Usar a cópia sem categoria_nome
                    )
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Registro criado para {paciente.user.first_name} - {data_reg}'
                        )
                    )
        
        # Criar algumas metas de exemplo
        metas_exemplo = [
            {
                'titulo': 'Praticar meditação diariamente',
                'descricao': 'Meditar por pelo menos 10 minutos todos os dias para reduzir ansiedade',
                'data_prevista': date.today() + timedelta(days=30),
                'progresso': 45
            },
            {
                'titulo': 'Exercitar-se 3x por semana',
                'descricao': 'Incluir atividade física na rotina para melhorar o humor e energia',
                'data_prevista': date.today() + timedelta(days=60),
                'progresso': 70
            },
            {
                'titulo': 'Ler um livro de desenvolvimento pessoal',
                'descricao': 'Investir no autoconhecimento através da leitura',
                'data_prevista': date.today() + timedelta(days=45),
                'progresso': 25
            }
        ]
        
        for paciente in pacientes:
            for meta_data in metas_exemplo:
                if not MetaOdisseia.objects.filter(
                    paciente=paciente,
                    titulo=meta_data['titulo']
                ).exists():
                    
                    meta = MetaOdisseia.objects.create(
                        paciente=paciente,
                        **meta_data
                    )
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Meta "{meta.titulo}" criada para {paciente.user.first_name}'
                        )
                    )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Processo concluído! Registros criados para {pacientes.count()} paciente(s).'
            )
        )