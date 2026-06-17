# modal의 예시 코드를 사용해본다.
# modal run src/ai_service_deploy/modal_example.py
import modal

app = modal.App('example-get-started') # name 지정

@app.function()
def square(x):
    print("이 코드는 remote worker에서 돌아간다!")
    return x**2

@app.local_entrypoint()
def main():
    print("the square is", square.remote(42))

