from services.ml_inference.src.inference import predict


def test_predict_identity():
    assert predict(2.0) == 2.0
