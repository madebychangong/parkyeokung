"""
현재 컴퓨터의 MAC 주소와 IP 주소를 확인하는 스크립트
"""

import psutil
import socket

def get_mac_address():
    """
    활성 네트워크 인터페이스의 실제 MAC 주소 가져오기
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

    return "Unknown"

def get_ip_address():
    """IP 주소 가져오기"""
    try:
        ip = socket.gethostbyname(socket.gethostname())
    except:
        ip = "Unknown"
    return ip

if __name__ == "__main__":
    print("=" * 50)
    print("현재 컴퓨터 정보")
    print("=" * 50)
    print(f"MAC 주소: {get_mac_address()}")
    print(f"IP 주소: {get_ip_address()}")
    print("=" * 50)
    print()
    print("위 MAC 주소를 복사해서 main.py의 ALLOWED_MACS 리스트에 추가하세요.")
    input("\n종료하려면 Enter를 누르세요...")
