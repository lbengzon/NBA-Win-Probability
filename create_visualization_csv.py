import create_classifier_model.py
import csv
from sklearn import tree, preprocessing, ensemble, neural_network
from sklearn.externals import joblib
import re

def main():
    create_csv()

def create_csv():
    classifier_model = joblib.load("winProbabilityMLP.pkl")
    encoder = joblib.load("winProbabilityEncoder.pkl")

    x, y = parse_csv('pbp_single_game.csv')

    encoded_x = encoder.transform(x)

    predicted_y = classifier_model.predict_proba(encoded_x)

    full_xy = list(zip(predicted_y, x))

    print(full_xy)



if __name__ == "__main__":
    main()