from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from browser_cookie3 import load
import os
import time
from dotenv import load_dotenv, set_key

# .env 파일 로드
ENV_FILE = '.env'
load_dotenv(ENV_FILE)

def update_env(key, value):
    """Update or add a key-value pair to the .env file."""
    set_key(ENV_FILE, key, value)
    print(f"{key} updated in {ENV_FILE}")

def naver_login(driver):
    try:
        """Login to Naver and wait for user interaction."""
        URL = 'https://nid.naver.com/nidlogin.login?mode=form&url=https://www.naver.com/'
        driver.get(URL) 
        print("로그인 버튼 클릭 완료")
        input("로그인을 완료한 후 Enter를 누르세요...")
    except Exception as e:
        print(f"로그인 중 오류 발생: {str(e)}")
        raise Exception(f"네이버 로그인에 실패했습니다. 오류: {str(e)}")


def extract_naver_cookies(driver):
    """Extract Naver cookies and save them to .env."""
    cookies = driver.get_cookies()
    nid_aut = nid_ses = None

    for cookie in cookies:
        if cookie['name'] == "NID_AUT":
            nid_aut = cookie['value']
        elif cookie['name'] == "NID_SES":
            nid_ses = cookie['value']

    if nid_aut and nid_ses:
        update_env("NID_AUT", nid_aut)
        update_env("NID_SES", nid_ses)
        print("쿠키가 성공적으로 저장되었습니다.")
    else:
        print("NID_AUT 또는 NID_SES 쿠키를 찾을 수 없습니다. 로그인 상태를 확인하세요.")

if __name__ == "__main__":
    # Step 1: ChromeOptions설정
    options = Options()
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--incognito")
    options.add_argument("--disable-gpu")
    # Step 2: 드라이버 생성
    driver = webdriver.Chrome(service=ChromeService(ChromeDriverManager().install()), options=options)

    try:
        # Step 3: 로그인 과정
        naver_login(driver)

        # Step 4: 쿠키 추출
        extract_naver_cookies(driver)
    finally:
        # Step 5: 드라이버 종료
        driver.quit()

