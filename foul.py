from create_classifier_model import parse_csv, getSecondsPassed
import csv
from sklearn import tree, preprocessing, ensemble, neural_network
from sklearn.externals import joblib
import re
import json

def main():
    foul_or_not()


def foul_or_not():
    #get the pickles that were saved when you created and trained the model and encoder
    classifier_model = joblib.load("winProbabilityMLP.pkl")
    encoder = joblib.load("winProbabilityEncoder.pkl")

    #parse the csv for the feature vectors
    pbp_csv = 'pbp_single_game.csv'
    x, y, full_features = parse_csv(pbp_csv)
    x = [[2851, 106, 105, 6, 1],[2851, 106, 105, 4, 0]]

    #encode the feature vectors
    encoded_x = encoder.transform(x)

    #use the pickled model to predict the outcome of each feature vector
    predicted_y = list(classifier_model.predict_proba(encoded_x))

    print(predicted_y)


if __name__ == "__main__":
    main()