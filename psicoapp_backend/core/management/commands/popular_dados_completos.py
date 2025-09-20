from django.core.management.base import BaseCommand
from authentication.models import Paciente, Psicologo
from core.models import (
    VinculoPacientePsicologo, NotificacaoSistema, Sessao, TipoSessao,
    SementeCuidado, RegistroOdisseia, MensagemPaciente
)
from django.utils import timezone
from datetime import date, timedelta
import random

class Command(BaseCommand):
    help = 'Popula dados completos para desenvolvimento'

    def add_arguments(self, parser):
        parser.add_argument(
            '--vincular',
            action='store_true',
            help='Criar vínculos entre pacientes e psicólogos',
        )
        parser.add_argument(
            '--sessoes',
            action='store_true',
            help='Criar sessões de exemplo',
        )
        parser.add_argument(
            '--notificacoes',
            action='store_true',
            help='Criar notificações de exemplo',
        )
        parser.add_argument(
            '--enviar-sementes',
            action='store_true',
            help='Enviar sementes para pacientes vinculados',
        )

    def handle(self, *args, **options):
        pacientes = Paciente.objects.all()
        psicologos = Psicologo.objects.all()
        
        if not pacientes.exists() or not psicologos.exists():
            self.stdout.write(
                self.style.WARNING('Certifique-se de ter pacientes e psicólogos cadastrados.')
            )
            return
        
        # Criar vínculos
        if options['vincular']:
            self.criar_vinculos(pacientes, psicologos)
        
        # Criar sessões
        if options['sessoes']:
            self.criar_sessoes()
        
        # Criar notificações
        if options['notificacoes']:
            self.criar_notificacoes(pacientes, psicologos)
        
        # Enviar sementes
        if options['enviar_sementes']:
            self.enviar_sementes()
        
        self.stdout.write(
            self.style.SUCCESS('✅ Dados populados com sucesso!')
        )

    def criar_vinculos(self, pacientes, psicologos):
        """Cria vínculos entre pacientes e psicólogos"""
        for paciente in pacientes:
            # Cada paciente pode estar vinculado a 1-2 psicólogos
            psicologos_selecionados = random.sample(
                list(psicologos), 
                min(random.randint(1, 2), len(psicologos))
            )
            
            for i, psicologo in enumerate(psicologos_selecionados):
                status = 'ativo' if i == 0 else random.choice(['ativo', 'inativo'])
                
                vinculo, created = VinculoPacientePsicologo.objects.get_or_create(
                    paciente=paciente,
                    psicologo=psicologo,
                    defaults={
                        'status': status,
                        'data_inicio_tratamento': date.today() - timedelta(days=random.randint(1, 365)),
                        'motivo_vinculo': random.choice([
                            'Busca via CRP',
                            'Indicação',
                            'Primeira consulta',
                            'Transferência'
                        ])
                    }
                )
                
                if created:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Vínculo criado: {paciente.user.first_name} ↔ {psicologo.user.first_name}'
                        )
                    )

    def criar_sessoes(self):
        """Cria sessões de exemplo"""
        vinculos = VinculoPacientePsicologo.objects.filter(status='ativo')
        
        for vinculo in vinculos:
            psicologo = vinculo.psicologo
            paciente = vinculo.paciente
            
            # Buscar tipos de sessão do psicólogo
            tipos_sessao = TipoSessao.objects.filter(psicologo=psicologo)
            if not tipos_sessao.exists():
                continue
            
            # Criar 3-8 sessões para cada vínculo
            num_sessoes = random.randint(3, 8)
            
            for i in range(num_sessoes):
                # Datas variadas (passado, presente, futuro)
                dias_offset = random.randint(-60, 30)
                data_sessao = timezone.now() + timedelta(days=dias_offset)
                
                # Status baseado na data
                if data_sessao < timezone.now() - timedelta(days=1):
                    status = random.choice(['realizada', 'cancelada', 'faltou'])
                elif data_sessao < timezone.now() + timedelta(days=1):
                    status = 'confirmada'
                else:
                    status = random.choice(['agendada', 'confirmada'])
                
                # Status de pagamento
                if status == 'realizada':
                    status_pagamento = random.choice(['pago', 'pendente', 'atrasado'])
                else:
                    status_pagamento = 'pendente'
                
                tipo_sessao = random.choice(tipos_sessao)
                
                sessao, created = Sessao.objects.get_or_create(
                    paciente=paciente,
                    psicologo=psicologo,
                    data_hora=data_sessao,
                    defaults={
                        'tipo_sessao': tipo_sessao,
                        'status': status,
                        'status_pagamento': status_pagamento,
                        'valor': tipo_sessao.valor,
                        'observacoes_agendamento': f'Sessão {i+1} - {tipo_sessao.nome}'
                    }
                )
                
                if created:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Sessão criada: {paciente.user.first_name} - {data_sessao.strftime("%d/%m/%Y %H:%M")}'
                        )
                    )

    def criar_notificacoes(self, pacientes, psicologos):
        """Cria notificações de exemplo"""
        notificacoes_exemplo = [
            {
                'tipo': 'sessao_lembrete',
                'titulo': 'Lembrete de Sessão',
                'mensagem': 'Você tem uma sessão agendada para amanhã às 14:00.'
            },
            {
                'tipo': 'nova_semente',
                'titulo': 'Nova Semente do Cuidado',
                'mensagem': 'Seu psicólogo enviou uma nova mensagem motivacional.'
            },
            {
                'tipo': 'novo_registro',
                'titulo': 'Novo Registro de Odisseia',
                'mensagem': 'Seu paciente fez um novo registro emocional.'
            },
            {
                'tipo': 'sistema',
                'titulo': 'Bem-vindo ao PsicoBem',
                'mensagem': 'Seja bem-vindo à nossa plataforma de cuidado psicológico!'
            }
        ]
        
        # Notificações para pacientes
        for paciente in pacientes:
            for _ in range(random.randint(2, 5)):
                notif_data = random.choice(notificacoes_exemplo)
                
                NotificacaoSistema.objects.create(
                    paciente=paciente,
                    **notif_data,
                    lida=random.choice([True, False])
                )
        
        # Notificações para psicólogos
        for psicologo in psicologos:
            for _ in range(random.randint(1, 3)):
                notif_data = random.choice(notificacoes_exemplo)
                
                NotificacaoSistema.objects.create(
                    psicologo=psicologo,
                    **notif_data,
                    lida=random.choice([True, False])
                )
        
        self.stdout.write(
            self.style.SUCCESS('Notificações criadas com sucesso!')
        )

    def enviar_sementes(self):
        """Envia sementes para pacientes vinculados"""
        sementes = SementeCuidado.objects.filter(status='ativa')
        
        for semente in sementes:
            # Buscar pacientes vinculados ao psicólogo da semente
            vinculos = VinculoPacientePsicologo.objects.filter(
                psicologo=semente.psicologo,
                status='ativo'
            )
            
            pacientes = [v.paciente for v in vinculos]
            
            if pacientes:
                envios = semente.enviar_para_pacientes(pacientes)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Semente "{semente.titulo}" enviada para {len(envios)} pacientes'
                    )
                )