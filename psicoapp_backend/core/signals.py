from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from authentication.models import Psicologo, Paciente
from sessoes.models import TipoSessao, Sessao
from engajamentos.models import CategoriaMensagem, RegistroOdisseia
from .models import (
    NotificacaoSistema, VinculoPacientePsicologo
)
from .services import NotificationDomainService

@receiver(post_save, sender=Psicologo)
def criar_tipos_sessao_padrao(sender, instance, created, **kwargs):
    """Cria tipos de sessão padrão quando um novo psicólogo é cadastrado"""
    if created:
        tipos_padrao = [
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
            }
        ]
        
        for tipo_data in tipos_padrao:
            TipoSessao.objects.create(
                psicologo=instance,
                **tipo_data
            )

@receiver(post_save, sender=Psicologo)
def criar_categorias_mensagem_padrao(sender, instance, created, **kwargs):
    """Cria categorias de mensagem padrão quando um novo psicólogo é cadastrado"""
    if created:
        categorias_padrao = [
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
            }
        ]
        
        for categoria_data in categorias_padrao:
            CategoriaMensagem.objects.create(
                psicologo=instance,
                **categoria_data
            )

@receiver(post_save, sender=Paciente)
def notificacao_boas_vindas_paciente(sender, instance, created, **kwargs):
    """Cria notificação de boas-vindas para novos pacientes"""
    if created:
        NotificacaoSistema.objects.create(
            paciente=instance,
            tipo='sistema',
            titulo='Bem-vindo ao PsicoBem! 🌱',
            mensagem='Seja bem-vindo! Estamos aqui para apoiar sua jornada de bem-estar. '
                     'Explore as funcionalidades e conecte-se com seu psicólogo.',
            dados_extras={'first_login': True}
        )

@receiver(post_save, sender=RegistroOdisseia)
def notificar_psicologo_novo_registro(sender, instance, created, **kwargs):
    """Notifica psicólogo sobre novo registro do paciente"""
    if created and instance.compartilhar_psicologo:
        NotificationDomainService.emit_new_odisseia_record(instance)

@receiver(post_save, sender=Sessao)
def notificar_agendamento_sessao(sender, instance, created, **kwargs):
    """Notifica sobre agendamento/alterações de sessão"""
    if created:
        NotificationDomainService.emit_session_created(instance)

@receiver(pre_delete, sender=Sessao)
def validar_delecao_sessao(sender, instance, **kwargs):
    """Impede deleção de sessões com pagamento confirmado"""
    if instance.status_pagamento == 'pago':
        raise ValidationError(
            'Não é possível deletar sessões com pagamento confirmado.'
        )
