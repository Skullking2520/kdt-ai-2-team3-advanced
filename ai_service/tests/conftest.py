"""ai_service의 테스트 환경을 설정하기 위한 Pytest conftest 파일입니다.

이 모듈은 테스트 시 실제 외부 서비스나 대량의 연산이 필요한 임베딩 모델을 호출하지 않고,
결정적(deterministic)인 가짜 임베딩 모델(FakeEmbeddingModel) 및 테스트용 로컬 VectorDB(ChromaClient)를
생성하여 테스트 격리 및 속도를 개선하는 공통 픽스처(Fixtures)를 제공합니다.
"""

import pytest
import os
from ai_service.vectordb.chroma_client import ChromaClient

os.environ.setdefault("HF_XET_HIGH_PERFORMANCE", "1")

class FakeEmbeddingModel:
    """테스트용 결정적(deterministic) 임베딩 모델 클래스.

    실제 머신러닝 임베딩 모델 대신 텍스트의 정적 속성(길이, 문자 아스키 합 등)을
    이용하여 고정된 다차원 벡터 데이터를 생성함으로써 테스트의 일관성을 보장합니다.
    """

    def embed_query(self, text: str) -> list[float]:
        """입력 텍스트를 고정된 형태의 3차원 벡터(실수 리스트)로 임베딩합니다.

        Args:
            text (str): 임베딩을 수행할 대상 입력 문자열.

        Returns:
            list[float]: 다음 3개의 차원으로 구성된 벡터:
                1. 입력 텍스트의 문자 길이
                2. 문자 아스키 코드 값들의 합을 997로 나눈 나머지 (일종의 해시값)
                3. "택배", "배송", "delivery" 등의 특정 키워드가 포함되어 있으면 1.0, 없으면 0.0
        """
        lower_text = text.lower()
        return [
            float(len(text)), # 입력된 총 글자수
            float(sum(ord(char) for char in text) % 997), # 텍스트의 해시값
            1.0 if any(keyword in lower_text for keyword in ["택배", "배송", "delivery"]) else 0.0,
        ]


@pytest.fixture
def fake_embedding_model() -> FakeEmbeddingModel:
    """테스트용 FakeEmbeddingModel 인스턴스를 제공하는 Pytest 픽스처입니다.

    Returns:
        FakeEmbeddingModel: 테스트에 사용할 가짜 임베딩 모델 인스턴스.
    """
    return FakeEmbeddingModel()


@pytest.fixture
def chroma_db(tmp_path, fake_embedding_model) -> ChromaClient:
    """테스트용 Chroma VectorDB 클라이언트 인스턴스를 제공하는 Pytest 픽스처입니다.

    Pytest의 빌트인 `tmp_path` 픽스처를 활용하여, 각 테스트 단위마다 독립된
    임시 디렉터리 경로 내에 Chroma DB를 생성하며, 테스트가 완료되면 파일들이 자동으로 삭제됩니다.

    Args:
        tmp_path: Pytest에서 제공하는 유니크한 임시 디렉터리 경로 객체.
        fake_embedding_model (FakeEmbeddingModel): 가짜 임베딩 모델 픽스처.

    Returns:
        ChromaClient: 테스트 대상 ChromaClient 인스턴스.
    """
    return ChromaClient( 
        persistent_directory=str(tmp_path / "chroma_db"),
        embedding_model=fake_embedding_model,
        collection_name="test_smishing_patterns",
    )

