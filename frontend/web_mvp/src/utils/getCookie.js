function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
} // 쿠키 값을 읽어오는 헬퍼 함수

export default getCookie;
