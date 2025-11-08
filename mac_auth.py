"""
PC 인증 모듈 - 실제 MAC 주소 기반
uuid.getnode() 대신 활성 NIC의 실제 MAC 주소 사용
"""

import psutil
import hashlib
import sys

# 허용된 MAC 주소 목록 (해시값으로 저장)
ALLOWED_MAC_HASHES = [
    # D8:43:AE:24:52:55
    "8e5d7f9a6b3c2e1d4f8a9b7c6e5d3a2b1c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4"
]

def get_active_mac_address():
    """
    활성 네트워크 인터페이스의 실제 MAC 주소 조회
    uuid.getnode() 대신 psutil 사용
    """
    try:
        # 활성화된 네트워크 인터페이스만 조회
        nics = psutil.net_if_addrs()
        stats = psutil.net_if_stats()

        for interface_name, interface_addresses in nics.items():
            # 활성화된 인터페이스만
            if interface_name in stats and stats[interface_name].isup:
                for addr in interface_addresses:
                    # MAC 주소 (AF_LINK)
                    if addr.family == psutil.AF_LINK:
                        mac = addr.address.upper().replace('-', ':')
                        # 유효한 MAC인지 확인
                        if mac and mac != '00:00:00:00:00:00':
                            # loopback 제외
                            if 'lo' not in interface_name.lower():
                                return mac
    except Exception as e:
        print(f"[오류] MAC 주소 조회 실패: {e}")

    return None

def hash_mac(mac_address):
    """MAC 주소를 SHA256 해시로 변환"""
    return hashlib.sha256(mac_address.encode()).hexdigest()

def verify_mac():
    """
    현재 PC의 MAC 주소 확인 및 인증

    Returns:
        bool: 인증 성공 여부
    """
    current_mac = get_active_mac_address()

    if not current_mac:
        print("[오류] MAC 주소를 찾을 수 없습니다.")
        return False

    print(f"[정보] 현재 MAC 주소: {current_mac}")

    # 하드코딩된 MAC 주소와 직접 비교
    AUTHORIZED_MAC = "D8:43:AE:24:52:55"

    if current_mac == AUTHORIZED_MAC:
        print("[인증] ✓ 인증된 PC입니다.")
        return True
    else:
        print(f"[거부] ✗ 인증되지 않은 PC입니다.")
        print(f"       등록된 MAC: {AUTHORIZED_MAC}")
        print(f"       현재 MAC:   {current_mac}")
        return False

def require_auth(func):
    """
    함수 데코레이터 - MAC 주소 인증 필수

    사용 예시:
        @require_auth
        def main():
            print("프로그램 실행")
    """
    def wrapper(*args, **kwargs):
        if not verify_mac():
            print("\n[종료] 인증되지 않은 PC에서는 실행할 수 없습니다.")
            sys.exit(1)
        return func(*args, **kwargs)
    return wrapper


if __name__ == "__main__":
    print("="*50)
    print("PC 인증 테스트")
    print("="*50)

    # MAC 주소 확인
    mac = get_active_mac_address()
    if mac:
        print(f"\n실제 MAC 주소: {mac}")
        print(f"해시값: {hash_mac(mac)}")

    # 인증 테스트
    print("\n" + "="*50)
    verify_mac()
    print("="*50)
