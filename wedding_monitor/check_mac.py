"""
현재 컴퓨터의 MAC 주소와 IP 주소를 확인하는 스크립트
"""

import uuid
import socket

def get_mac_address():
    """MAC 주소 가져오기"""
    mac = ':'.join(['{:02x}'.format((uuid.getnode() >> elements) & 0xff)
                    for elements in range(0,2*6,2)][::-1])
    return mac

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
