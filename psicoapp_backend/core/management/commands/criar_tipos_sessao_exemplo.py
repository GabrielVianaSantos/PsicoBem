from django.core.management.base import BaseCommand
from authentication.models import Psicologo
from core.models import TipoSessao

class Command(BaseCommand):
    help = 'Cria tipos de sessão de exemplo para psicólogos cadastrados'

    def handle(self, *args, **options):
        psicologos = Psicologo.objects.all()
        
        if not psicologos.exists():
            self.stdout.write(
                self.style.WARNING('Nenhum psicólogo encontrado. Cadastre um psicólogo primeiro.')
            )
            return
        
        tipos_exemplo = [
            {
                'nome': 'Primeira Sessão',
                'tipo': 'primeira',
                'valor': 150.00,
                'duracao_minutos': 90,
                'descricao': 'Sessão inicial de avaliação e acolhimento'
            },
            {
                'nome': 'Sessão Regular',
                'tipo': 'avulsa',
                'valor': 120.00,
                'duracao_minutos': 50,
                'descricao': 'Sessão terapêutica regular'
            },
            {
                'nome': 'Urgência',
                'tipo': 'urgencia',
                'valor': 180.00,
                'duracao_minutos': 50,
                'descricao': 'Sessão de urgência'
            },
            {
                'nome': 'Online',
                'tipo': 'online',
                'valor': 100.00,
                'duracao_minutos': 50,
                'descricao': 'Sessão online via videochamada'
            },
            {
                'nome': 'Pacote 4 Sessões',
                'tipo': 'pacote',
                'valor': 400.00,
                'duracao_minutos': 50,
                'descricao': 'Pacote com desconto para 4 sessões'
            }
        ]
        
        for psicologo in psicologos:
            for tipo_data in tipos_exemplo:
                tipo_sessao, created = TipoSessao.objects.get_or_create(
                    psicologo=psicologo,
                    nome=tipo_data['nome'],
                    defaults=tipo_data
                )
                if created:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Tipo de sessão "{tipo_sessao.nome}" criado para {psicologo.user.first_name}'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Tipo de sessão "{tipo_sessao.nome}" já existe para {psicologo.user.first_name}'
                        )
                    )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Processo concluído! Tipos de sessão criados para {psicologos.count()} psicólogo(s).'
            )
        )