import unittest

from api.feedback import parse_feedback


class ParseFeedbackTest(unittest.TestCase):
    def test_splits_the_three_blocks(self) -> None:
        raw = (
            "Pontos positivos:\n"
            "- Usou a expressão \"I work with Python\".\n"
            "\n"
            "Pontos de melhoria:\n"
            "- A resposta ficou curta.\n"
            "\n"
            "Próximo passo:\n"
            "- Repetir a apresentação em duas frases.\n"
        )
        blocks = parse_feedback(raw)
        self.assertIn("I work with Python", blocks["pontos_positivos"])
        self.assertIn("curta", blocks["pontos_de_melhoria"])
        self.assertIn("apresentação", blocks["proximo_passo"])

    def test_does_not_invent_missing_blocks(self) -> None:
        blocks = parse_feedback("texto sem os cabeçalhos pedidos")
        self.assertEqual(blocks["pontos_positivos"], "")
        self.assertEqual(blocks["pontos_de_melhoria"], "")
        self.assertEqual(blocks["proximo_passo"], "")


if __name__ == "__main__":
    unittest.main()
