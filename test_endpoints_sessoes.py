#!/usr/bin/env python3
"""
Script de teste para os endpoints de Sessões do PsicoBem
Execução: python3 test_endpoints_sessoes.py
"""

import requests
import json
from datetime import datetime, timedelta
import sys

# Configurações
BASE_URL = "http://127.0.0.1:8000/api"
COLORS = {
    'GREEN': '\033[92m',
    'RED': '\033[91m',
    'YELLOW': '\033[93m',
    'BLUE': '\033[94m',
    'END': '\033[0m',
    'BOLD': '\033[1m'
}

# Variáveis globais para armazenar dados de teste
TOKEN = None
TIPO_SESSAO_ID = None
PACIENTE_ID = None
SESSAO_ID = None


def print_header(text):
    """Imprime cabeçalho formatado"""
    print(f"\n{COLORS['BOLD']}{COLORS['BLUE']}{'=' * 60}{COLORS['END']}")
    print(f"{COLORS['BOLD']}{COLORS['BLUE']}{text.center(60)}{COLORS['END']}")
    print(f"{COLORS['BOLD']}{COLORS['BLUE']}{'=' * 60}{COLORS['END']}\n")


def print_success(text):
    """Imprime mensagem de sucesso"""
    print(f"{COLORS['GREEN']}✓ {text}{COLORS['END']}")


def print_error(text):
    """Imprime mensagem de erro"""
    print(f"{COLORS['RED']}✗ {text}{COLORS['END']}")


def print_warning(text):
    """Imprime mensagem de aviso"""
    print(f"{COLORS['YELLOW']}⚠ {text}{COLORS['END']}")


def print_info(text):
    """Imprime informação"""
    print(f"{COLORS['BLUE']}ℹ {text}{COLORS['END']}")


def print_response(response, show_body=True):
    """Imprime detalhes da resposta"""
    print(f"  Status Code: {response.status_code}")
    if show_body:
        try:
            data = response.json()
            print(f"  Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
        except:
            print(f"  Response: {response.text}")


# ==================== TESTES ====================

def test_login():
    """Teste 1: Login e obtenção do token"""
    global TOKEN
    
    print_header("TESTE 1: Login")
    
    # Tentar com psicólogo
    emails = [
        {"email": "psicologo@example.com", "password": "senha123"},
        {"email": "admin@psicobem.com", "password": "admin123"},
        {"email": "joao@example.com", "password": "senha123"}
    ]
    
    for credentials in emails:
        print_info(f"Tentando login com: {credentials['email']}")
        response = requests.post(
            f"{BASE_URL}/auth/login/",
            json=credentials
        )
        
        if response.status_code == 200:
            data = response.json()
            TOKEN = data.get('tokens', {}).get('access') or data.get('access')
            print_success(f"Login bem-sucedido! Token obtido.")
            print(f"  Email: {credentials['email']}")
            print(f"  Token: {TOKEN[:50]}...")
            return True
        else:
            print_warning(f"Falha no login com {credentials['email']}")
            print_response(response, False)
    
    print_error("Não foi possível fazer login com nenhuma credencial")
    return False


def test_listar_tipos_sessao():
    """Teste 2: Listar tipos de sessão"""
    print_header("TESTE 2: Listar Tipos de Sessão")
    
    headers = {"Authorization": f"Bearer {TOKEN}"}
    response = requests.get(f"{BASE_URL}/tipos-sessao/", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print_success(f"Tipos de sessão listados com sucesso! Total: {len(data)}")
        print_response(response)
        return True
    else:
        print_error("Falha ao listar tipos de sessão")
        print_response(response)
        return False


def test_criar_tipo_sessao():
    """Teste 3: Criar tipo de sessão"""
    global TIPO_SESSAO_ID
    
    print_header("TESTE 3: Criar Tipo de Sessão")
    
    headers = {"Authorization": f"Bearer {TOKEN}"}
    data = {
        "nome": f"Teste API {datetime.now().strftime('%H:%M:%S')}",
        "tipo": "online",
        "valor": "100.00",
        "duracao_minutos": 50,
        "descricao": "Tipo criado via teste automatizado",
        "ativo": True
    }
    
    response = requests.post(
        f"{BASE_URL}/tipos-sessao/",
        headers=headers,
        json=data
    )
    
    if response.status_code == 201:
        result = response.json()
        TIPO_SESSAO_ID = result.get('id')
        print_success(f"Tipo de sessão criado! ID: {TIPO_SESSAO_ID}")
        print_response(response)
        return True
    else:
        print_error("Falha ao criar tipo de sessão")
        print_response(response)
        return False


def test_listar_tipos_ativos():
    """Teste 4: Listar apenas tipos ativos"""
    print_header("TESTE 4: Listar Tipos Ativos")
    
    headers = {"Authorization": f"Bearer {TOKEN}"}
    response = requests.get(f"{BASE_URL}/tipos-sessao/ativos/", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print_success(f"Tipos ativos listados! Total: {len(data)}")
        print_response(response)
        return True
    else:
        print_error("Falha ao listar tipos ativos")
        print_response(response)
        return False


def test_listar_pacientes_vinculados():
    """Teste 5: Listar pacientes vinculados"""
    global PACIENTE_ID
    
    print_header("TESTE 5: Listar Pacientes Vinculados")
    
    headers = {"Authorization": f"Bearer {TOKEN}"}
    response = requests.get(
        f"{BASE_URL}/sessoes/pacientes-vinculados/",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print_success(f"Pacientes vinculados listados! Total: {len(data)}")
        if len(data) > 0:
            PACIENTE_ID = data[0]['id']
            print(f"  Primeiro paciente ID: {PACIENTE_ID}")
        print_response(response)
        return True
    else:
        print_error("Falha ao listar pacientes vinculados")
        print_response(response)
        return False


def test_criar_sessao():
    """Teste 6: Criar sessão"""
    global SESSAO_ID
    
    print_header("TESTE 6: Criar Sessão")
    
    if not PACIENTE_ID:
        print_warning("PACIENTE_ID não encontrado. Pulando teste.")
        return False
    
    if not TIPO_SESSAO_ID:
        print_warning("TIPO_SESSAO_ID não encontrado. Pulando teste.")
        return False
    
    headers = {"Authorization": f"Bearer {TOKEN}"}
    data_hora = (datetime.now() + timedelta(days=7)).replace(microsecond=0).isoformat() + 'Z'
    
    data = {
        "paciente_id": PACIENTE_ID,
        "tipo_sessao_id": TIPO_SESSAO_ID,
        "data_hora": data_hora,
        "status": "agendada",
        "observacoes_agendamento": "Sessão criada via teste automatizado"
    }
    
    print_info(f"Criando sessão para {data_hora}")
    print(f"  Paciente ID: {PACIENTE_ID}")
    print(f"  Tipo Sessão ID: {TIPO_SESSAO_ID}")
    
    response = requests.post(
        f"{BASE_URL}/sessoes/",
        headers=headers,
        json=data
    )
    
    if response.status_code == 201:
        result = response.json()
        SESSAO_ID = result.get('id')
        print_success(f"Sessão criada! ID: {SESSAO_ID}")
        print_response(response)
        return True
    else:
        print_error("Falha ao criar sessão")
        print_response(response)
        return False


def test_listar_sessoes():
    """Teste 7: Listar sessões"""
    print_header("TESTE 7: Listar Sessões")
    
    headers = {"Authorization": f"Bearer {TOKEN}"}
    response = requests.get(f"{BASE_URL}/sessoes/", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print_success(f"Sessões listadas! Total: {len(data)}")
        print_response(response)
        return True
    else:
        print_error("Falha ao listar sessões")
        print_response(response)
        return False


def test_buscar_sessao():
    """Teste 8: Buscar sessão específica"""
    print_header("TESTE 8: Buscar Sessão Específica")
    
    if not SESSAO_ID:
        print_warning("SESSAO_ID não encontrado. Pulando teste.")
        return False
    
    headers = {"Authorization": f"Bearer {TOKEN}"}
    response = requests.get(f"{BASE_URL}/sessoes/{SESSAO_ID}/", headers=headers)
    
    if response.status_code == 200:
        print_success("Sessão encontrada!")
        print_response(response)
        return True
    else:
        print_error("Falha ao buscar sessão")
        print_response(response)
        return False


def test_sessoes_hoje():
    """Teste 9: Sessões de hoje"""
    print_header("TESTE 9: Sessões de Hoje")
    
    headers = {"Authorization": f"Bearer {TOKEN}"}
    response = requests.get(f"{BASE_URL}/sessoes/hoje/", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print_success(f"Sessões de hoje: {len(data)}")
        print_response(response)
        return True
    else:
        print_error("Falha ao buscar sessões de hoje")
        print_response(response)
        return False


def test_sessoes_semana():
    """Teste 10: Sessões da semana"""
    print_header("TESTE 10: Sessões da Semana")
    
    headers = {"Authorization": f"Bearer {TOKEN}"}
    response = requests.get(f"{BASE_URL}/sessoes/semana/", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print_success(f"Sessões da semana: {len(data)}")
        print_response(response)
        return True
    else:
        print_error("Falha ao buscar sessões da semana")
        print_response(response)
        return False


def test_sessoes_mes():
    """Teste 11: Sessões do mês"""
    print_header("TESTE 11: Sessões do Mês")
    
    headers = {"Authorization": f"Bearer {TOKEN}"}
    ano = datetime.now().year
    mes = datetime.now().month
    
    response = requests.get(
        f"{BASE_URL}/sessoes/mes/?ano={ano}&mes={mes}",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print_success(f"Sessões do mês {mes}/{ano}: {len(data)}")
        print_response(response)
        return True
    else:
        print_error("Falha ao buscar sessões do mês")
        print_response(response)
        return False


def test_estatisticas():
    """Teste 12: Estatísticas do psicólogo"""
    print_header("TESTE 12: Estatísticas")
    
    headers = {"Authorization": f"Bearer {TOKEN}"}
    response = requests.get(f"{BASE_URL}/sessoes/estatisticas/", headers=headers)
    
    if response.status_code == 200:
        print_success("Estatísticas obtidas!")
        print_response(response)
        return True
    else:
        print_error("Falha ao buscar estatísticas")
        print_response(response)
        return False


def test_atualizar_sessao():
    """Teste 13: Atualizar sessão"""
    print_header("TESTE 13: Atualizar Sessão")
    
    if not SESSAO_ID:
        print_warning("SESSAO_ID não encontrado. Pulando teste.")
        return False
    
    headers = {"Authorization": f"Bearer {TOKEN}"}
    data = {
        "status": "confirmada",
        "observacoes_agendamento": "Sessão confirmada via teste automatizado"
    }
    
    response = requests.patch(
        f"{BASE_URL}/sessoes/{SESSAO_ID}/",
        headers=headers,
        json=data
    )
    
    if response.status_code == 200:
        print_success("Sessão atualizada!")
        print_response(response)
        return True
    else:
        print_error("Falha ao atualizar sessão")
        print_response(response)
        return False


def test_cancelar_sessao():
    """Teste 14: Cancelar sessão"""
    print_header("TESTE 14: Cancelar Sessão")
    
    if not SESSAO_ID:
        print_warning("SESSAO_ID não encontrado. Pulando teste.")
        return False
    
    headers = {"Authorization": f"Bearer {TOKEN}"}
    response = requests.post(
        f"{BASE_URL}/sessoes/{SESSAO_ID}/cancelar/",
        headers=headers
    )
    
    if response.status_code == 200:
        print_success("Sessão cancelada!")
        print_response(response)
        return True
    else:
        print_error("Falha ao cancelar sessão")
        print_response(response)
        return False


def test_validacao_data_passado():
    """Teste 15: Validação - data no passado"""
    print_header("TESTE 15: Validação - Data no Passado")
    
    if not PACIENTE_ID or not TIPO_SESSAO_ID:
        print_warning("Dados necessários não encontrados. Pulando teste.")
        return False
    
    headers = {"Authorization": f"Bearer {TOKEN}"}
    data_passado = (datetime.now() - timedelta(days=1)).replace(microsecond=0).isoformat() + 'Z'
    
    data = {
        "paciente_id": PACIENTE_ID,
        "tipo_sessao_id": TIPO_SESSAO_ID,
        "data_hora": data_passado,
        "status": "agendada"
    }
    
    response = requests.post(
        f"{BASE_URL}/sessoes/",
        headers=headers,
        json=data
    )
    
    if response.status_code == 400:
        print_success("Validação funcionou! Data no passado rejeitada.")
        print_response(response)
        return True
    else:
        print_error("Validação falhou - deveria rejeitar data no passado")
        print_response(response)
        return False


# ==================== EXECUÇÃO DOS TESTES ====================

def run_all_tests():
    """Executa todos os testes"""
    print(f"\n{COLORS['BOLD']}{'=' * 60}{COLORS['END']}")
    print(f"{COLORS['BOLD']}  TESTES DOS ENDPOINTS DE SESSÕES - PSICOBEM  {COLORS['END']}")
    print(f"{COLORS['BOLD']}{'=' * 60}{COLORS['END']}")
    
    tests = [
        ("Login", test_login),
        ("Listar Tipos de Sessão", test_listar_tipos_sessao),
        ("Criar Tipo de Sessão", test_criar_tipo_sessao),
        ("Listar Tipos Ativos", test_listar_tipos_ativos),
        ("Listar Pacientes Vinculados", test_listar_pacientes_vinculados),
        ("Criar Sessão", test_criar_sessao),
        ("Listar Sessões", test_listar_sessoes),
        ("Buscar Sessão", test_buscar_sessao),
        ("Sessões de Hoje", test_sessoes_hoje),
        ("Sessões da Semana", test_sessoes_semana),
        ("Sessões do Mês", test_sessoes_mes),
        ("Estatísticas", test_estatisticas),
        ("Atualizar Sessão", test_atualizar_sessao),
        ("Cancelar Sessão", test_cancelar_sessao),
        ("Validação Data Passado", test_validacao_data_passado),
    ]
    
    results = []
    
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print_error(f"Erro inesperado no teste '{name}': {str(e)}")
            results.append((name, False))
    
    # Resumo
    print_header("RESUMO DOS TESTES")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        if result:
            print_success(f"{name}")
        else:
            print_error(f"{name}")
    
    print(f"\n{COLORS['BOLD']}Total: {passed}/{total} testes passaram{COLORS['END']}")
    
    if passed == total:
        print_success("\nTodos os testes passaram! 🎉")
        return 0
    else:
        print_error(f"\n{total - passed} testes falharam.")
        return 1


if __name__ == "__main__":
    try:
        exit_code = run_all_tests()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\nTestes interrompidos pelo usuário.")
        sys.exit(1)
    except Exception as e:
        print_error(f"\nErro fatal: {str(e)}")
        sys.exit(1)
