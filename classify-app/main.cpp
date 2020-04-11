#include "mainwindow.h"

#include <QApplication>

int main(int argc, char *argv[])
{
    QApplication a(argc, argv);
    a.setApplicationName("Indie-pocket classifier");
    a.setOrganizationName("EPFL");
    a.setOrganizationDomain("epfl.ch");

    MainWindow w;
    w.show();
    return a.exec();
}
