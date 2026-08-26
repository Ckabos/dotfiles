#!/bin/bash

sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

ln -s $HOME/Varda-Theme/zsh/varda.zsh-theme $HOME/.oh-my-zsh/themes/
ln -s $HOME/Varda-Theme/zsh/theme.zsh $HOME/.oh-my-zsh/themes/
ln -s $HOME/Varda-Theme/zsh/zshrc $HOME/.zshrc
